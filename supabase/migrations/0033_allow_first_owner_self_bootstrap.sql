-- 0033_allow_first_owner_self_bootstrap
-- Purpose: Allow self-service first-owner setup without service_role.
-- Only works when no active admin exists. After first admin exists, function is blocked.
-- This resolves P1-1 blocker for self-service sale.

create or replace function public.claim_first_owner()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  existing_admin_id uuid;
  result_profile public.profiles;
begin
  -- Only authenticated callers
  caller_id := auth.uid();
  if caller_id is null then
    raise exception using errcode = '42501', message = 'LENA_NOT_AUTHENTICATED';
  end if;

  -- Serialize bootstrap attempts
  perform pg_advisory_xact_lock(hashtext('lena-first-owner-claim-v1'));

  -- Check if active admin already exists
  select id into existing_admin_id
  from public.profiles
  where role = 'admin' and is_active
  limit 1
  for update;

  if existing_admin_id is not null then
    raise exception using errcode = '42501', message = 'LENA_OWNER_ALREADY_BOOTSTRAPPED';
  end if;

  -- Ensure caller profile exists (created by handle_new_auth_user trigger)
  -- Allow bootstrap authorization for this transaction
  insert into private.owner_bootstrap_authorizations (profile_id)
  values (caller_id)
  on conflict (profile_id) do update set created_at = excluded.created_at;

  -- Promote caller to active admin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    caller_id,
    coalesce(
      (select full_name from public.profiles where id = caller_id),
      'مديرة المعرض'
    ),
    'admin',
    true
  )
  on conflict (id) do update
  set role = 'admin',
      is_active = true,
      updated_at = now();

  delete from private.owner_bootstrap_authorizations where profile_id = caller_id;

  select * into result_profile from public.profiles where id = caller_id;
  return result_profile;
end;
$$;

revoke all on function public.claim_first_owner() from public, anon;
grant execute on function public.claim_first_owner() to authenticated;

-- Also add helper to check if setup is needed (public, anon can read count? No, only authenticated can check, but we want landing to know)
create or replace function public.is_first_owner_setup_needed()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_admin boolean;
begin
  select exists(select 1 from public.profiles where role='admin' and is_active) into has_admin;
  return not has_admin;
end;
$$;

revoke all on function public.is_first_owner_setup_needed() from public, anon;
grant execute on function public.is_first_owner_setup_needed() to anon, authenticated;

comment on function public.claim_first_owner() is 'Self-service first owner bootstrap when no active admin exists';
comment on function public.is_first_owner_setup_needed() is 'Returns true if no active admin exists and setup is needed';
