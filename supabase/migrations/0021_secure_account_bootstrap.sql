-- 0021_secure_account_bootstrap
--
-- Security boundary:
--   * Auth sign-up is never an owner-bootstrap mechanism.
--   * Every trigger-created profile is inactive staff.
--   * Only a trusted database/service-role operator may bootstrap or recover the
--     single active owner through private.bootstrap_lena_owner(uuid).
--   * The final active administrator cannot be demoted, disabled, or deleted.
--
-- Supabase Auth's `disable_signup` setting lives outside PostgreSQL. It must be
-- disabled in the linked Auth project as an operational control, but this
-- migration is intentionally safe even if public registration is accidentally
-- enabled: a new Auth user cannot obtain an active admin profile through SQL.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Do not infer authority from account creation order. An unauthenticated
  -- caller can create an Auth user through GoTrue even when no React sign-up UI
  -- exists. Activation and role assignment are trusted owner operations.
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'مستخدم جديد'
    ),
    'staff',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger functions are called only by the auth.users trigger. No API caller
-- should be able to invoke this definer function directly.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated, service_role;
-- The trigger runs as its owner; no API/database role needs direct execution.

-- A one-transaction marker is the only way the profile privilege trigger
-- permits a non-admin promotion. The table stays in the private schema; normal
-- API roles receive neither schema/table access nor a function that can write it.
create table if not exists private.owner_bootstrap_authorizations (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table private.owner_bootstrap_authorizations from public, anon, authenticated;

create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile identity cannot be changed';
  end if;

  if (
    new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
  )
  and not private.is_lena_admin()
  and not exists (
    select 1
    from private.owner_bootstrap_authorizations
    where profile_id = new.id
  ) then
    raise exception 'only an active admin can change account privileges';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_profile_privileges() from public, anon, authenticated;

-- Explicit one-owner bootstrap/recovery path. This function deliberately lives
-- in the private schema and is not granted to anon/authenticated. Invoke it
-- only through a trusted database connection or service-role operational runbook
-- after verifying the intended auth.users UUID.
create or replace function private.bootstrap_lena_owner(p_owner_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
  target_metadata jsonb;
  target_profile public.profiles;
  active_admin_id uuid;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'LENA_OWNER_ID_REQUIRED';
  end if;

  -- Serialise bootstrap attempts. Two recovery operators cannot race to create
  -- different owners, and repeated calls for the same owner are idempotent.
  perform pg_advisory_xact_lock(hashtext('lena-owner-bootstrap-v1'));

  select email, raw_user_meta_data
  into target_email, target_metadata
  from auth.users
  where id = p_owner_id;

  if not found then
    raise exception using errcode = '22023', message = 'LENA_OWNER_AUTH_USER_NOT_FOUND';
  end if;

  select id
  into active_admin_id
  from public.profiles
  where role = 'admin' and is_active
  limit 1
  for update;

  if active_admin_id is not null and active_admin_id <> p_owner_id then
    raise exception using errcode = '42501', message = 'LENA_OWNER_ALREADY_BOOTSTRAPPED';
  end if;

  insert into private.owner_bootstrap_authorizations (profile_id)
  values (p_owner_id)
  on conflict (profile_id) do update set created_at = excluded.created_at;

  insert into public.profiles (id, full_name, role, is_active)
  values (
    p_owner_id,
    coalesce(
      nullif(trim(target_metadata->>'full_name'), ''),
      nullif(split_part(coalesce(target_email, ''), '@', 1), ''),
      'مديرة المعرض'
    ),
    'admin',
    true
  )
  on conflict (id) do update
  set role = 'admin',
      is_active = true,
      updated_at = now();

  delete from private.owner_bootstrap_authorizations where profile_id = p_owner_id;

  select *
  into target_profile
  from public.profiles
  where id = p_owner_id;

  return target_profile;
end;
$$;

revoke all on function private.bootstrap_lena_owner(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.bootstrap_lena_owner(uuid) to postgres, service_role;

-- Database-side recovery guard. UI checks are helpful, but direct PostgREST
-- calls must not be able to leave the showroom with no administrator.
create or replace function private.prevent_last_active_lena_admin_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Updates to two different administrator rows do not naturally conflict at
  -- PostgreSQL row-lock level. Serialize every demotion/deletion decision so
  -- two concurrent administrators cannot each observe the other as active and
  -- leave the showroom without an owner.
  perform pg_advisory_xact_lock(hashtext('lena-active-admin-invariant-v1'));

  if tg_op = 'UPDATE'
     and old.role = 'admin'
     and old.is_active
     and (new.role <> 'admin' or not new.is_active) then
    if not exists (
      select 1
      from public.profiles
      where id <> old.id
        and role = 'admin'
        and is_active
    ) then
      raise exception using errcode = '23514', message = 'LENA_LAST_ACTIVE_ADMIN_REQUIRED';
    end if;
  end if;

  if tg_op = 'DELETE'
     and old.role = 'admin'
     and old.is_active then
    if not exists (
      select 1
      from public.profiles
      where id <> old.id
        and role = 'admin'
        and is_active
    ) then
      raise exception using errcode = '23514', message = 'LENA_LAST_ACTIVE_ADMIN_REQUIRED';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.prevent_last_active_lena_admin_loss() from public, anon, authenticated;

drop trigger if exists profiles_prevent_last_active_admin_loss on public.profiles;
create trigger profiles_prevent_last_active_admin_loss
before update or delete on public.profiles
for each row execute function private.prevent_last_active_lena_admin_loss();
