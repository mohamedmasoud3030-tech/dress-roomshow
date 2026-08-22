\set ON_ERROR_STOP on

-- Historical proof for the disposable clean database only. It applies the
-- pre-remediation migration set (through 0020) and demonstrates exactly why the
-- old RPC was unsafe: active staff could replace an existing reservation field
-- with a client-authored full snapshot and the database accepted it.

insert into auth.users (id, email, raw_user_meta_data)
values
  ('90000000-0000-4000-8000-000000000001', 'old-owner@example.test', '{"full_name":"Old owner"}'),
  ('90000000-0000-4000-8000-000000000002', 'old-staff@example.test', '{"full_name":"Old staff"}');

-- Before 0021 the first trigger-created user is an active admin.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', false);
update public.profiles set is_active = true where id = '90000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub', '', false);

update public.showroom_state
set snapshot = jsonb_set(
  snapshot,
  '{collections,reservations}',
  '[{"id":"legacy-reservation-1","reservationNumber":"LEGACY-RSV-1","status":"confirmed","remainingAmount":100,"rentalPrice":100,"customerId":"legacy-customer","inventoryItemId":"legacy-dress"}]'::jsonb
), revision = 0;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select revision from public.apply_showroom_snapshot(
  0,
  jsonb_set(
    (select snapshot from public.showroom_state where id = 'main'),
    '{collections,reservations,0,rentalPrice}',
    '999'::jsonb
  ),
  'legacy-bypass-proof-001',
  'reservation.updateLine'
);
commit;

do $$
begin
  if (select snapshot #>> '{collections,reservations,0,rentalPrice}' from public.showroom_state where id = 'main') <> '999' then
    raise exception 'TEST: expected legacy full-snapshot bypass did not reproduce';
  end if;
end;
$$;
