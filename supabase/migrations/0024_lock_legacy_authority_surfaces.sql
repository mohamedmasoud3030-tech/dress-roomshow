-- 0024_lock_legacy_authority_surfaces
--
-- The Web/PWA source of truth is public.showroom_state plus the constrained
-- command RPC. The pre-snapshot normalized tables remain only as historical
-- compatibility/reporting data. Leaving their old authenticated DML grants in
-- place creates an alternate direct-write surface that can diverge from the
-- authoritative snapshot.
--
-- No table is dropped and no historical data is rewritten. This migration only
-- removes browser-role access that the current Web/PWA runtime no longer uses.

revoke all on table
  public.dresses,
  public.dress_images,
  public.customers,
  public.reservations,
  public.payments,
  public.returns,
  public.expenses
from authenticated, anon;

-- Remove obsolete permissive mutation policies as defence in depth. Grants are
-- already revoked above; dropping policies prevents a future accidental grant
-- from silently restoring the old direct-table authority.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'dresses', 'dress_images', 'customers', 'reservations', 'returns', 'expenses'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_active', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_active', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_admin', table_name);
  end loop;
end;
$$;

drop policy if exists payments_insert_active on public.payments;
drop policy if exists "dresses_select_public_available" on public.dresses;
drop policy if exists "dress_images_select_public_available" on public.dress_images;

-- Keep RLS enabled as a second line of defence if a privileged maintenance path
-- later needs one of these tables. The official client reads/writes only the
-- constrained snapshot command surface and the narrow public projections.
alter table public.dresses force row level security;
alter table public.dress_images force row level security;
alter table public.customers force row level security;
alter table public.reservations force row level security;
alter table public.payments force row level security;
alter table public.returns force row level security;
alter table public.expenses force row level security;
