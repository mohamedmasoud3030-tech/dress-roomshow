-- 0019_audit_and_snapshot_validation
-- Restore append-only business audit protection and reject malformed financial
-- snapshots at the authoritative showroom_state boundary.

do $$
declare
  function_definition text;
  current_list constant text := '''payments'', ''expenses'', ''sales'', ''sales-invoices'', ''sale-returns'',
      ''daily-closings''';
  hardened_list constant text := '''payments'', ''expenses'', ''sales'', ''sales-invoices'', ''sale-returns'',
      ''audit-log'', ''audit'', ''daily-closings''';
begin
  select pg_get_functiondef('public.apply_showroom_snapshot(bigint,jsonb,text,text)'::regprocedure)
  into function_definition;

  if position(hardened_list in function_definition) = 0 then
    if position(current_list in function_definition) = 0 then
      raise exception 'LENA_APPLY_SNAPSHOT_DEFINITION_UNEXPECTED';
    end if;
    execute replace(function_definition, current_list, hardened_list);
  end if;
end $$;

create or replace function private.validate_showroom_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_name text;
  items jsonb;
begin
  if new.snapshot is null
     or jsonb_typeof(new.snapshot) <> 'object'
     or new.snapshot ->> 'applicationId' <> 'dress-roomshow'
     or jsonb_typeof(new.snapshot -> 'collections') <> 'object' then
    raise exception using errcode = '22023', message = 'LENA_INVALID_SNAPSHOT';
  end if;

  foreach collection_name in array array[
    'customers', 'dresses', 'reservations', 'payments', 'expenses',
    'delivery-return', 'sales', 'sales-invoices', 'sale-returns',
    'service-tasks', 'audit-log', 'daily-closings', 'accessories',
    'reservation-accessories', 'appointments', 'waitlist'
  ] loop
    items := new.snapshot #> array['collections', collection_name];
    if items is null or jsonb_typeof(items) <> 'array' then
      raise exception using errcode = '22023', message = 'LENA_INVALID_COLLECTION_' || collection_name;
    end if;

    if exists (
      select 1 from jsonb_array_elements(items) item
      where jsonb_typeof(item) <> 'object' or coalesce(item ->> 'id', '') = ''
    ) then
      raise exception using errcode = '22023', message = 'LENA_INVALID_ENTITY_' || collection_name;
    end if;

    if exists (
      select item ->> 'id'
      from jsonb_array_elements(items) item
      group by item ->> 'id'
      having count(*) > 1
    ) then
      raise exception using errcode = '23505', message = 'LENA_DUPLICATE_ENTITY_' || collection_name;
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(new.snapshot #> '{collections,payments}') payment
    where coalesce(payment ->> 'reservationNumber', '') = ''
       or coalesce(payment ->> 'type', '') = ''
       or payment ->> 'direction' not in ('income', 'refund', 'settlement')
       or jsonb_typeof(payment -> 'amount') <> 'number'
       or (payment ->> 'amount')::numeric <= 0
  ) then
    raise exception using errcode = '22023', message = 'LENA_INVALID_PAYMENT';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.snapshot #> '{collections,expenses}') expense
    where coalesce(expense ->> 'expenseDate', '') = ''
       or jsonb_typeof(expense -> 'amount') <> 'number'
       or (expense ->> 'amount')::numeric <= 0
  ) then
    raise exception using errcode = '22023', message = 'LENA_INVALID_EXPENSE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.snapshot #> '{collections,sales}') sale
    where coalesce(sale ->> 'saleDate', '') = ''
       or jsonb_typeof(sale -> 'amount') <> 'number'
       or (sale ->> 'amount')::numeric <= 0
  ) then
    raise exception using errcode = '22023', message = 'LENA_INVALID_SALE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.snapshot #> '{collections,reservations}') reservation
    where reservation ->> 'status' not in ('pending', 'confirmed', 'delivered', 'returned', 'cancelled', 'overdue')
       or coalesce(reservation ->> 'reservationNumber', '') = ''
       or jsonb_typeof(reservation -> 'remainingAmount') <> 'number'
       or (reservation ->> 'remainingAmount')::numeric < 0
  ) then
    raise exception using errcode = '22023', message = 'LENA_INVALID_RESERVATION';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_showroom_snapshot() from public, anon, authenticated;

drop trigger if exists showroom_state_validate_snapshot on public.showroom_state;
create trigger showroom_state_validate_snapshot
before insert or update of snapshot on public.showroom_state
for each row execute function private.validate_showroom_snapshot();

revoke all on function public.apply_showroom_snapshot(bigint, jsonb, text, text) from public, anon;
grant execute on function public.apply_showroom_snapshot(bigint, jsonb, text, text) to authenticated;
