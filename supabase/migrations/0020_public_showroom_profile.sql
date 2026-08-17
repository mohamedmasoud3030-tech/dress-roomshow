-- 0020_public_showroom_profile
-- Public, deliberately narrow projection of the owner-edited landing profile.
-- The private operational snapshot remains unreadable to anonymous visitors.

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

create or replace function private.sync_showroom_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  projected_profile jsonb;
begin
  projected_profile := coalesce(new.snapshot #> '{collections,showroom-profile,0}', '{}'::jsonb);
  if jsonb_typeof(projected_profile) <> 'object' then
    raise exception using errcode = '22023', message = 'LENA_INVALID_PUBLIC_PROFILE';
  end if;

  insert into public.showroom_public_profile (id, profile, updated_at)
  values ('main', projected_profile, now())
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

insert into public.showroom_public_profile (id, profile)
select 'main', coalesce(snapshot #> '{collections,showroom-profile,0}', '{}'::jsonb)
from public.showroom_state
where id = 'main'
on conflict (id) do update
set profile = excluded.profile,
    updated_at = now();
