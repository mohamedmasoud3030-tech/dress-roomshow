-- 0023_repair_public_showroom_profile_projection
--
-- Forward-only repair for deployments where migration 0020 was not applied (or
-- was recorded without its relation being present). This migration is
-- idempotent and also replaces the broad JSON copy with a field allowlist.
--
-- Do not repair this through ad-hoc dashboard SQL. Apply the normal migration
-- chain so the migration ledger, schema, policy, trigger, and initial projection
-- stay in one reviewable deployment.

create table if not exists public.showroom_public_profile (
  id text primary key default 'main' check (id = 'main'),
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.showroom_public_profile enable row level security;
alter table public.showroom_public_profile force row level security;

revoke all on table public.showroom_public_profile from anon, authenticated;
grant select on table public.showroom_public_profile to anon, authenticated;

drop policy if exists showroom_public_profile_read on public.showroom_public_profile;
create policy showroom_public_profile_read
on public.showroom_public_profile for select
to anon, authenticated
using (id = 'main');

-- Return a JSON string only when the source value is a string. This avoids
-- copying arbitrary objects/scalars into the anonymous projection.
create or replace function private.lena_public_profile_text(source jsonb, key text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(source -> key) = 'string' then source -> key
    else '""'::jsonb
  end;
$$;

revoke all on function private.lena_public_profile_text(jsonb, text) from public, anon, authenticated;

-- Arrays are projected item-by-item as well. Copying an entire public-content
-- array would make a future private property on a category/service/FAQ object
-- anonymously readable without another reviewed migration.
create or replace function private.lena_public_profile_pair_array(
  source jsonb,
  first_key text,
  second_key text
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        first_key, private.lena_public_profile_text(item, first_key),
        second_key, private.lena_public_profile_text(item, second_key)
      ) order by ordinal
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case when jsonb_typeof(source) = 'array' then source else '[]'::jsonb end
  ) with ordinality as entry(item, ordinal)
  where jsonb_typeof(item) = 'object';
$$;

create or replace function private.lena_public_profile_string_array(source jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(item order by ordinal),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case when jsonb_typeof(source) = 'array' then source else '[]'::jsonb end
  ) with ordinality as entry(item, ordinal)
  where jsonb_typeof(item) = 'string';
$$;

revoke all on function private.lena_public_profile_pair_array(jsonb, text, text) from public, anon, authenticated;
revoke all on function private.lena_public_profile_string_array(jsonb) from public, anon, authenticated;

create or replace function private.project_lena_public_showroom_profile(source jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  contact jsonb := case when jsonb_typeof(source -> 'contact') = 'object' then source -> 'contact' else '{}'::jsonb end;
begin
  if jsonb_typeof(source) <> 'object' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'brandName', private.lena_public_profile_text(source, 'brandName'),
    'shortTagline', private.lena_public_profile_text(source, 'shortTagline'),
    'heroTitle', private.lena_public_profile_text(source, 'heroTitle'),
    'heroDescription', private.lena_public_profile_text(source, 'heroDescription'),
    'aboutTitle', private.lena_public_profile_text(source, 'aboutTitle'),
    'aboutDescription', private.lena_public_profile_text(source, 'aboutDescription'),
    'categories', private.lena_public_profile_pair_array(source -> 'categories', 'name', 'description'),
    'services', private.lena_public_profile_pair_array(source -> 'services', 'title', 'description'),
    'steps', private.lena_public_profile_pair_array(source -> 'steps', 'title', 'description'),
    'faq', private.lena_public_profile_pair_array(source -> 'faq', 'question', 'answer'),
    'contact', jsonb_build_object(
      'phone', private.lena_public_profile_text(contact, 'phone'),
      'alternatePhones', private.lena_public_profile_string_array(contact -> 'alternatePhones'),
      'whatsapp', private.lena_public_profile_text(contact, 'whatsapp'),
      'email', private.lena_public_profile_text(contact, 'email'),
      'alternateEmail', private.lena_public_profile_text(contact, 'alternateEmail'),
      'instagram', private.lena_public_profile_text(contact, 'instagram'),
      'address', private.lena_public_profile_text(contact, 'address'),
      'workingHours', private.lena_public_profile_text(contact, 'workingHours')
    )
  );
end;
$$;

revoke all on function private.project_lena_public_showroom_profile(jsonb) from public, anon, authenticated;

create or replace function private.sync_showroom_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_profile jsonb;
begin
  source_profile := coalesce(new.snapshot #> '{collections,showroom-profile,0}', '{}'::jsonb);

  insert into public.showroom_public_profile (id, profile, updated_at)
  values ('main', private.project_lena_public_showroom_profile(source_profile), now())
  on conflict (id) do update
  set profile = excluded.profile,
      updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function private.sync_showroom_public_profile() from public, anon, authenticated;

drop trigger if exists showroom_state_sync_public_profile on public.showroom_state;
create trigger showroom_state_sync_public_profile
after insert or update of snapshot on public.showroom_state
for each row execute function private.sync_showroom_public_profile();

-- Backfill/reconcile the public projection from the authoritative state. If the
-- state row has not been provisioned yet, no synthetic profile is invented.
insert into public.showroom_public_profile (id, profile, updated_at)
select
  'main',
  private.project_lena_public_showroom_profile(coalesce(snapshot #> '{collections,showroom-profile,0}', '{}'::jsonb)),
  now()
from public.showroom_state
where id = 'main'
on conflict (id) do update
set profile = excluded.profile,
    updated_at = excluded.updated_at;
