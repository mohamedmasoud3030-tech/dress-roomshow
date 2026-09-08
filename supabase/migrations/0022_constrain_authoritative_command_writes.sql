-- 0022_constrain_authoritative_command_writes
--
-- Replaces the client-authored full-snapshot write RPC with a constrained
-- command-patch boundary. A browser may submit only the records changed by one
-- named workflow. PostgreSQL reconstructs the candidate state from the current
-- authoritative snapshot, verifies the changed collections and cross-record
-- invariants, and appends a server-attributed audit entry.
--
-- The old apply_showroom_snapshot RPC is deliberately disabled rather than
-- retained as an administrative escape hatch. Backup restore/reset are explicit
-- admin commands and must not become a second generic write surface.

-- ── JSON snapshot helpers ───────────────────────────────────────────────────

create or replace function private.lena_snapshot_collection(snapshot jsonb, collection_name text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(snapshot #> array['collections', collection_name]) = 'array'
      then snapshot #> array['collections', collection_name]
    else '[]'::jsonb
  end;
$$;

create or replace function private.lena_snapshot_entity(items jsonb, entity_id text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select value
  from jsonb_array_elements(coalesce(items, '[]'::jsonb))
  where value ->> 'id' = entity_id
  limit 1;
$$;

create or replace function private.lena_replace_snapshot_entity(items jsonb, entity jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  result jsonb;
  entity_id text := entity ->> 'id';
begin
  if entity_id is null or entity_id = '' then
    raise exception using errcode = '22023', message = 'LENA_PATCH_ENTITY_ID_REQUIRED';
  end if;

  if private.lena_snapshot_entity(items, entity_id) is null then
    return coalesce(items, '[]'::jsonb) || jsonb_build_array(entity);
  end if;

  select coalesce(
    jsonb_agg(case when value ->> 'id' = entity_id then entity else value end order by ordinal),
    '[]'::jsonb
  )
  into result
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) with ordinality as entry(value, ordinal);

  return result;
end;
$$;

create or replace function private.lena_remove_snapshot_entity(items jsonb, entity_id text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(value order by ordinal), '[]'::jsonb)
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) with ordinality as entry(value, ordinal)
  where value ->> 'id' <> entity_id;
$$;

create or replace function private.lena_json_number(value jsonb, fallback numeric default 0)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if value is null or jsonb_typeof(value) <> 'number' then return fallback; end if;
  return (value #>> '{}')::numeric;
exception when invalid_text_representation then
  raise exception using errcode = '22023', message = 'LENA_INVALID_NUMERIC_VALUE';
end;
$$;

create or replace function private.lena_entity_number(entity jsonb, key text, fallback numeric default 0)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select private.lena_json_number(entity -> key, fallback);
$$;

create or replace function private.lena_known_collection(collection_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select collection_name = any (array[
    'customers', 'dresses', 'dress-designs', 'accessories',
    'reservation-accessories', 'reservations', 'appointments', 'payments',
    'expenses', 'delivery-return', 'sales', 'sales-invoices', 'sale-returns',
    'service-tasks', 'audit-log', 'audit', 'daily-closings', 'counters',
    'command-log', 'reminder-dismissals', 'operators',
    'customer-conduct-notes', 'waitlist', 'print-settings', 'retired-codes',
    'preferences', 'showroom-profile', 'stocktake-sessions',
    'message-templates', 'images'
  ]);
$$;

create or replace function private.lena_known_command(command_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select command_name = any (array[
    'inventory.create', 'inventory.archive', 'inventory.delete', 'inventory.images',
    'customer.create', 'customer.update', 'customer.archive', 'customer.delete',
    'customer.conduct.add', 'customer.conduct.remove',
    'waitlist.create', 'waitlist.notify', 'waitlist.close', 'waitlist.convert',
    'stocktake.start', 'stocktake.complete', 'stocktake.cancel',
    'preferences.save', 'profile.save', 'profile.reset',
    'print-settings.save', 'print-settings.reset',
    'message-templates.save', 'message-templates.reset', 'reminder.dismiss',
    'backup.export', 'database.reset', 'database.import', 'storage.migrate-images',
    'accessory.create', 'accessory.update', 'accessory.retire',
    'accessory.attach', 'accessory.detach',
    'design.create', 'design.add-variants', 'design.assign-piece', 'design.archive',
    'appointment.book', 'appointment.status',
    'daily-close.close', 'daily-close.reopen',
    'delivery.complete', 'return.complete',
    'expense.post', 'payment.record', 'payment.settle-return',
    'reservation.create', 'reservation.cancel', 'reservation.addLine',
    'reservation.removeLine', 'reservation.updateLine',
    'reservation.deliverLine', 'reservation.returnLine', 'reservation.reschedule',
    'sale.create-invoice', 'sale.return-line',
    'service.open', 'service.start', 'service.complete', 'service.cancel'
  ]);
$$;

create or replace function private.lena_command_collections(command_name text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
begin
  case command_name
    when 'inventory.create', 'inventory.archive', 'inventory.delete', 'inventory.images'
      then return array['dresses', 'counters', 'retired-codes'];
    when 'customer.create', 'customer.update', 'customer.archive', 'customer.delete'
      then return array['customers'];
    when 'customer.conduct.add', 'customer.conduct.remove'
      then return array['customer-conduct-notes'];
    when 'waitlist.create', 'waitlist.notify', 'waitlist.close', 'waitlist.convert'
      then return array['waitlist'];
    when 'stocktake.start', 'stocktake.complete', 'stocktake.cancel'
      then return array['stocktake-sessions'];
    when 'preferences.save' then return array['preferences'];
    when 'profile.save', 'profile.reset' then return array['showroom-profile'];
    when 'print-settings.save', 'print-settings.reset' then return array['print-settings'];
    when 'message-templates.save', 'message-templates.reset' then return array['message-templates'];
    when 'reminder.dismiss' then return array['reminder-dismissals'];
    when 'backup.export' then return array[]::text[];
    when 'database.reset', 'database.import' then return array[
      'customers', 'dresses', 'dress-designs', 'accessories', 'reservation-accessories',
      'reservations', 'appointments', 'payments', 'expenses', 'delivery-return',
      'sales', 'sales-invoices', 'sale-returns', 'service-tasks', 'daily-closings',
      'counters', 'reminder-dismissals', 'operators', 'customer-conduct-notes',
      'waitlist', 'print-settings', 'retired-codes', 'preferences',
      'showroom-profile', 'stocktake-sessions', 'message-templates', 'images'
    ];
    when 'storage.migrate-images' then return array['dresses', 'images'];
    when 'accessory.create', 'accessory.update', 'accessory.retire'
      then return array['accessories', 'counters', 'retired-codes'];
    when 'accessory.attach', 'accessory.detach'
      then return array['accessories', 'reservation-accessories'];
    when 'design.create', 'design.add-variants', 'design.assign-piece', 'design.archive'
      then return array['dress-designs', 'dresses', 'counters', 'retired-codes'];
    when 'appointment.book', 'appointment.status' then return array['appointments'];
    when 'daily-close.close', 'daily-close.reopen' then return array['daily-closings'];
    when 'delivery.complete', 'return.complete' then return array[
      'delivery-return', 'reservations', 'dresses', 'payments', 'accessories', 'reservation-accessories'
    ];
    when 'expense.post' then return array['expenses'];
    when 'payment.record', 'payment.settle-return' then return array['payments', 'reservations'];
    when 'reservation.create' then return array['reservations', 'waitlist'];
    when 'reservation.cancel' then return array['reservations', 'accessories', 'reservation-accessories'];
    when 'reservation.addLine', 'reservation.removeLine', 'reservation.updateLine',
         'reservation.deliverLine', 'reservation.returnLine', 'reservation.reschedule'
      then return array['reservations', 'dresses', 'payments'];
    when 'sale.create-invoice' then return array['sales-invoices', 'sales', 'dresses'];
    when 'sale.return-line' then return array['sale-returns', 'dresses'];
    when 'service.open', 'service.start', 'service.complete', 'service.cancel'
      then return array['service-tasks', 'dresses', 'expenses'];
    else
      raise exception using errcode = '22023', message = 'LENA_UNKNOWN_COMMAND';
  end case;
end;
$$;

-- ── Invariant guards ────────────────────────────────────────────────────────

create or replace function private.lena_assert_append_only(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  collection_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_entity jsonb;
  candidate_entity jsonb;
begin
  for previous_entity in
    select value from jsonb_array_elements(private.lena_snapshot_collection(current_snapshot, collection_name))
  loop
    candidate_entity := private.lena_snapshot_entity(
      private.lena_snapshot_collection(candidate_snapshot, collection_name),
      previous_entity ->> 'id'
    );

    if candidate_entity is null or candidate_entity <> previous_entity then
      raise exception using errcode = '42501', message = 'LENA_APPEND_ONLY_VIOLATION_' || collection_name;
    end if;
  end loop;
end;
$$;

create or replace function private.lena_assert_new_payment_records(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment jsonb;
  reservation jsonb;
  new_payment_count integer := 0;
  payment_type text;
  payment_direction text;
  amount numeric;
  prior_same_key integer;
begin
  for payment in select value from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'payments')) loop
    if private.lena_snapshot_entity(private.lena_snapshot_collection(current_snapshot, 'payments'), payment ->> 'id') is not null then
      continue;
    end if;

    new_payment_count := new_payment_count + 1;
    payment_type := payment ->> 'type';
    payment_direction := payment ->> 'direction';
    amount := private.lena_entity_number(payment, 'amount');
    reservation := (
      select value
      from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations'))
      where value ->> 'reservationNumber' = payment ->> 'reservationNumber'
      limit 1
    );

    if reservation is null then
      raise exception using errcode = '22023', message = 'LENA_PAYMENT_RESERVATION_REQUIRED';
    end if;
    if amount <= 0 or payment ->> 'paymentDate' is null or payment ->> 'paymentDate' > current_date::text then
      raise exception using errcode = '22023', message = 'LENA_INVALID_PAYMENT';
    end if;

    if coalesce(payment_type, '') not in (
      'rental', 'rental_payment', 'booking_advance', 'security_deposit_collection',
      'deposit', 'penalty', 'adjustment', 'refund', 'security_deposit_refund',
      'security_deposit_retention', 'retained_deposit', 'late_fee', 'damage_fee',
      'deposit_settlement'
    ) or coalesce(payment_direction, '') not in ('income', 'refund', 'settlement') then
      raise exception using errcode = '22023', message = 'LENA_PAYMENT_TYPE_INVALID';
    end if;

    if (payment_type in ('rental', 'rental_payment', 'booking_advance', 'security_deposit_collection', 'deposit', 'penalty', 'adjustment') and payment_direction <> 'income')
       or (payment_type in ('refund', 'security_deposit_refund') and payment_direction <> 'refund')
       or (payment_type in ('security_deposit_retention', 'retained_deposit', 'late_fee', 'damage_fee', 'deposit_settlement') and payment_direction <> 'settlement') then
      raise exception using errcode = '22023', message = 'LENA_PAYMENT_DIRECTION_INVALID';
    end if;

    if coalesce(payment ->> 'source', '') not in ('manual', 'return')
       or abs(private.lena_entity_number(payment, 'reservationTotal') - private.lena_entity_number(reservation, 'totalAmount')) > 0.001 then
      raise exception using errcode = '22023', message = 'LENA_PAYMENT_RECORD_INVALID';
    end if;

    if command_name = 'payment.record'
       and (
         coalesce(payment ->> 'source', '') <> 'manual'
         or payment_type in ('security_deposit_retention', 'retained_deposit', 'late_fee', 'damage_fee', 'deposit_settlement')
       ) then
      raise exception using errcode = '42501', message = 'LENA_PAYMENT_RECORD_COMMAND_INVALID';
    end if;

    if command_name in ('payment.settle-return', 'return.complete', 'reservation.returnLine')
       and coalesce(payment ->> 'source', '') <> 'return' then
      raise exception using errcode = '42501', message = 'LENA_RETURN_SETTLEMENT_COMMAND_INVALID';
    end if;

    if payment ->> 'customerName' is distinct from reservation ->> 'customerName'
       or payment ->> 'dressCode' is distinct from reservation ->> 'dressCode'
       or payment ->> 'dressName' is distinct from reservation ->> 'dressName' then
      raise exception using errcode = '22023', message = 'LENA_PAYMENT_SNAPSHOT_MISMATCH';
    end if;

    if payment ->> 'idempotencyKey' is not null then
      select count(*) into prior_same_key
      from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'payments')) existing
      where existing ->> 'reservationNumber' = payment ->> 'reservationNumber'
        and existing ->> 'idempotencyKey' = payment ->> 'idempotencyKey';
      if prior_same_key > 1 then
        raise exception using errcode = '23505', message = 'LENA_PAYMENT_IDEMPOTENCY_CONFLICT';
      end if;
    end if;
  end loop;

  if new_payment_count > 0 and command_name not in (
    'payment.record', 'payment.settle-return', 'return.complete', 'reservation.returnLine'
  ) then
    raise exception using errcode = '42501', message = 'LENA_PAYMENT_COMMAND_REQUIRED';
  end if;

  if command_name = 'payment.record' and new_payment_count <> 1 then
    raise exception using errcode = '22023', message = 'LENA_PAYMENT_RECORD_REQUIRES_ONE_MOVEMENT';
  end if;
end;
$$;

create or replace function private.lena_assert_reservation_financials(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  patch jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation jsonb;
  reservation_number text;
  touched boolean;
  rental_collected numeric;
  booking_collected numeric;
  security_collected numeric;
  security_refunded numeric;
  security_retained numeric;
  rental_refunded numeric;
  rental_total numeric;
  assessed_fees numeric;
  expected_remaining numeric;
begin
  for reservation in select value from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations')) loop
    reservation_number := reservation ->> 'reservationNumber';
    if reservation_number is null or reservation_number = '' then
      raise exception using errcode = '22023', message = 'LENA_INVALID_RESERVATION';
    end if;

    -- Do not reject an untouched legacy reservation merely because a historical
    -- snapshot predates canonical collected-amount fields. Every new/changed
    -- reservation and every reservation receiving a newly appended movement is
    -- checked strictly at this boundary.
    touched := private.lena_snapshot_entity(
      private.lena_snapshot_collection(current_snapshot, 'reservations'),
      reservation ->> 'id'
    ) is null
    or exists (
      select 1
      from jsonb_array_elements(coalesce(patch -> 'upserts' -> 'reservations', '[]'::jsonb)) patched
      where patched ->> 'id' = reservation ->> 'id'
    )
    or exists (
      select 1
      from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'payments')) payment
      where payment ->> 'reservationNumber' = reservation_number
        and private.lena_snapshot_entity(private.lena_snapshot_collection(current_snapshot, 'payments'), payment ->> 'id') is null
    );
    if not touched then continue; end if;

    select
      coalesce(sum(case when p ->> 'direction' = 'income' and p ->> 'type' in ('rental', 'rental_payment') then private.lena_entity_number(p, 'amount') else 0 end), 0),
      coalesce(sum(case when p ->> 'direction' = 'income' and p ->> 'type' = 'booking_advance' then private.lena_entity_number(p, 'amount') else 0 end), 0),
      coalesce(sum(case when p ->> 'direction' = 'income' and p ->> 'type' in ('security_deposit_collection', 'deposit') then private.lena_entity_number(p, 'amount') else 0 end), 0),
      coalesce(sum(case when p ->> 'direction' = 'refund' and p ->> 'type' = 'security_deposit_refund' then private.lena_entity_number(p, 'amount') else 0 end), 0),
      coalesce(sum(case when p ->> 'direction' = 'settlement' and p ->> 'type' in ('security_deposit_retention', 'retained_deposit') then private.lena_entity_number(p, 'amount') else 0 end), 0),
      coalesce(sum(case when p ->> 'direction' = 'refund' and p ->> 'type' = 'refund' then private.lena_entity_number(p, 'amount') else 0 end), 0)
    into rental_collected, booking_collected, security_collected, security_refunded, security_retained, rental_refunded
    from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'payments')) p
    where p ->> 'reservationNumber' = reservation_number;

    if private.lena_entity_number(reservation, 'rentalCollectedAmount') <> rental_collected
       or private.lena_entity_number(reservation, 'bookingAdvanceCollectedAmount') <> booking_collected
       or private.lena_entity_number(reservation, 'securityDepositCollectedAmount') <> security_collected
       or private.lena_entity_number(reservation, 'securityDepositRefundedAmount') <> security_refunded
       or private.lena_entity_number(reservation, 'securityDepositRetainedAmount') <> security_retained
       or private.lena_entity_number(reservation, 'rentalRefundedAmount') <> rental_refunded
       or private.lena_entity_number(reservation, 'paidAmount') <> rental_collected + booking_collected then
      raise exception using errcode = '22023', message = 'LENA_RESERVATION_LEDGER_MISMATCH';
    end if;

    if security_refunded + security_retained > security_collected
       or security_collected > private.lena_entity_number(reservation, 'securityDepositAmount') + 0.001
       or rental_refunded > rental_collected + 0.001 then
      raise exception using errcode = '22023', message = 'LENA_SECURITY_DEPOSIT_LIABILITY_VIOLATION';
    end if;

    if jsonb_typeof(reservation -> 'lines') = 'array' then
      select coalesce(sum(private.lena_entity_number(line, 'rentalPrice')), 0)
      into rental_total
      from jsonb_array_elements(reservation -> 'lines') line;
    else
      rental_total := private.lena_entity_number(reservation, 'rentalPrice');
    end if;

    assessed_fees := private.lena_entity_number(reservation, 'assessedFeesAmount');
    if rental_collected + booking_collected > rental_total + assessed_fees + 0.001 then
      raise exception using errcode = '22023', message = 'LENA_RENTAL_OVERPAYMENT';
    end if;

    expected_remaining := greatest(
      rental_total + assessed_fees - booking_collected - rental_collected + rental_refunded - security_retained,
      0
    );
    if abs(private.lena_entity_number(reservation, 'remainingAmount') - expected_remaining) > 0.001 then
      raise exception using errcode = '22023', message = 'LENA_RESERVATION_BALANCE_MISMATCH';
    end if;
  end loop;
end;
$$;

create or replace function private.lena_assert_reservation_transitions(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_reservation jsonb;
  next_reservation jsonb;
  previous_status text;
  next_status text;
  previous_line jsonb;
  next_line jsonb;
  previous_payments integer;
begin
  -- Existing reservations are permanent historical records. Their stable
  -- identity cannot be changed or removed through any command patch.
  for previous_reservation in select value from jsonb_array_elements(private.lena_snapshot_collection(current_snapshot, 'reservations')) loop
    next_reservation := private.lena_snapshot_entity(
      private.lena_snapshot_collection(candidate_snapshot, 'reservations'),
      previous_reservation ->> 'id'
    );
    if next_reservation is null then
      raise exception using errcode = '42501', message = 'LENA_RESERVATION_DELETE_FORBIDDEN';
    end if;

    if next_reservation = previous_reservation then continue; end if;

    if command_name not in (
      'reservation.cancel', 'reservation.addLine', 'reservation.removeLine',
      'reservation.updateLine', 'reservation.deliverLine', 'reservation.returnLine',
      'reservation.reschedule', 'payment.record', 'payment.settle-return',
      'delivery.complete', 'return.complete', 'accessory.attach', 'accessory.detach'
    ) then
      raise exception using errcode = '42501', message = 'LENA_RESERVATION_COMMAND_REQUIRED';
    end if;

    if next_reservation ->> 'reservationNumber' is distinct from previous_reservation ->> 'reservationNumber'
       or next_reservation ->> 'customerId' is distinct from previous_reservation ->> 'customerId'
       or next_reservation ->> 'customerNameSnapshot' is distinct from previous_reservation ->> 'customerNameSnapshot'
       or next_reservation ->> 'customerPhoneSnapshot' is distinct from previous_reservation ->> 'customerPhoneSnapshot' then
      raise exception using errcode = '22023', message = 'LENA_RESERVATION_IDENTITY_IMMUTABLE';
    end if;

    previous_status := previous_reservation ->> 'status';
    next_status := next_reservation ->> 'status';
    if not (
      previous_status = next_status
      or (previous_status in ('pending', 'confirmed') and next_status in ('delivered', 'cancelled'))
      or (previous_status in ('delivered', 'overdue') and next_status = 'returned')
      or (previous_status in ('pending', 'confirmed', 'delivered') and next_status = 'overdue')
    ) then
      raise exception using errcode = '22023', message = 'LENA_RESERVATION_TRANSITION_INVALID';
    end if;

    if previous_status in ('pending', 'confirmed') and next_status = 'delivered'
       and command_name not in ('delivery.complete', 'reservation.deliverLine') then
      raise exception using errcode = '42501', message = 'LENA_DELIVERY_COMMAND_REQUIRED';
    end if;
    if previous_status in ('delivered', 'overdue') and next_status = 'returned'
       and command_name not in ('return.complete', 'reservation.returnLine') then
      raise exception using errcode = '42501', message = 'LENA_RETURN_COMMAND_REQUIRED';
    end if;
    if next_status = 'cancelled' and previous_status <> 'cancelled'
       and command_name <> 'reservation.cancel' then
      raise exception using errcode = '42501', message = 'LENA_CANCEL_COMMAND_REQUIRED';
    end if;

    -- Per-line handover history is immutable except for its one-way delivery
    -- and return transitions. A caller cannot mark a line returned/delivered by
    -- relabelling an arbitrary reservation update command. Legacy single-line
    -- records without persisted line IDs continue through the top-level guard.
    if jsonb_typeof(previous_reservation -> 'lines') = 'array'
       and jsonb_array_length(previous_reservation -> 'lines') > 0 then
      for previous_line in select value from jsonb_array_elements(previous_reservation -> 'lines') loop
        next_line := private.lena_snapshot_entity(private.lena_reservation_lines(next_reservation), previous_line ->> 'id');
        if next_line is null then
          if command_name <> 'reservation.removeLine' then
            raise exception using errcode = '42501', message = 'LENA_RESERVATION_LINE_DELETE_FORBIDDEN';
          end if;
          continue;
        end if;
        if previous_line ->> 'deliveryStatus' is distinct from next_line ->> 'deliveryStatus' then
          if previous_line ->> 'deliveryStatus' = 'pending_delivery'
             and next_line ->> 'deliveryStatus' = 'delivered' then
            if command_name not in ('delivery.complete', 'reservation.deliverLine') then
              raise exception using errcode = '42501', message = 'LENA_DELIVERY_COMMAND_REQUIRED';
            end if;
          elsif previous_line ->> 'deliveryStatus' in ('delivered', 'late')
             and next_line ->> 'deliveryStatus' = 'returned' then
            if command_name not in ('return.complete', 'reservation.returnLine') then
              raise exception using errcode = '42501', message = 'LENA_RETURN_COMMAND_REQUIRED';
            end if;
          else
            raise exception using errcode = '22023', message = 'LENA_RESERVATION_LINE_TRANSITION_INVALID';
          end if;
        end if;
      end loop;
    end if;

    select count(*) into previous_payments
    from jsonb_array_elements(private.lena_snapshot_collection(current_snapshot, 'payments')) payment
    where payment ->> 'reservationNumber' = previous_reservation ->> 'reservationNumber';

    if previous_payments > 0
       and (
         next_reservation ->> 'pickupDate' is distinct from previous_reservation ->> 'pickupDate'
         or next_reservation ->> 'returnDate' is distinct from previous_reservation ->> 'returnDate'
         or next_reservation ->> 'rentalPrice' is distinct from previous_reservation ->> 'rentalPrice'
       ) then
      raise exception using errcode = '22023', message = 'LENA_POSTED_RESERVATION_VALUE_IMMUTABLE';
    end if;
  end loop;

  -- New reservations must reference existing customer/inventory records and
  -- carry a valid, non-negative booking interval. Detailed availability remains
  -- checked by the workflow command, while this blocks direct orphan/negative
  -- records at the authority boundary.
  for next_reservation in select value from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations')) loop
    if private.lena_snapshot_entity(private.lena_snapshot_collection(current_snapshot, 'reservations'), next_reservation ->> 'id') is not null then
      continue;
    end if;

    if command_name <> 'reservation.create'
       or next_reservation ->> 'customerId' is null
       or next_reservation ->> 'inventoryItemId' is null
       or coalesce(next_reservation ->> 'status', '') not in ('pending', 'confirmed')
       or next_reservation ->> 'pickupDate' is null
       or next_reservation ->> 'returnDate' is null
       or next_reservation ->> 'returnDate' <= next_reservation ->> 'pickupDate'
       or private.lena_snapshot_entity(private.lena_snapshot_collection(candidate_snapshot, 'customers'), next_reservation ->> 'customerId') is null
       or private.lena_snapshot_entity(private.lena_snapshot_collection(candidate_snapshot, 'dresses'), next_reservation ->> 'inventoryItemId') is null then
      raise exception using errcode = '22023', message = 'LENA_RESERVATION_CREATE_INVALID';
    end if;

    if jsonb_typeof(next_reservation -> 'lines') = 'array' then
      for next_line in select value from jsonb_array_elements(next_reservation -> 'lines') loop
        if next_line ->> 'inventoryItemId' is null
           or private.lena_snapshot_entity(private.lena_snapshot_collection(candidate_snapshot, 'dresses'), next_line ->> 'inventoryItemId') is null
           or next_line ->> 'returnDate' <= next_line ->> 'pickupDate' then
          raise exception using errcode = '22023', message = 'LENA_RESERVATION_LINE_INVALID';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

create or replace function private.lena_reservation_lines(reservation jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(reservation -> 'lines') = 'array' and jsonb_array_length(reservation -> 'lines') > 0
      then reservation -> 'lines'
    else jsonb_build_array(jsonb_build_object(
      'inventoryItemId', reservation ->> 'inventoryItemId',
      'pickupDate', reservation ->> 'pickupDate',
      'returnDate', reservation ->> 'returnDate'
    ))
  end;
$$;

create or replace function private.lena_assert_reservation_availability(
  candidate_snapshot jsonb,
  patch jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_reservation jsonb;
  other_reservation jsonb;
  target_line jsonb;
  other_line jsonb;
  preferences jsonb;
  before_buffer integer := 0;
  after_buffer integer := 0;
  active_statuses text[] := array['pending', 'confirmed', 'delivered', 'overdue'];
begin
  if command_name not in ('reservation.create', 'reservation.addLine', 'reservation.updateLine', 'reservation.reschedule') then
    return;
  end if;

  preferences := private.lena_snapshot_collection(candidate_snapshot, 'preferences') -> 0;
  before_buffer := greatest(private.lena_entity_number(preferences, 'preparationDaysBeforePickup', private.lena_entity_number(preferences, 'reservationBufferDays', 0))::integer, 0);
  after_buffer := greatest(private.lena_entity_number(preferences, 'cleaningDaysAfterReturn', private.lena_entity_number(preferences, 'reservationBufferDays', 0))::integer, 0);

  for target_reservation in
    select value
    from jsonb_array_elements(coalesce(patch -> 'upserts' -> 'reservations', '[]'::jsonb))
  loop
    if coalesce(target_reservation ->> 'status', '') <> all(active_statuses) then continue; end if;

    for target_line in select value from jsonb_array_elements(private.lena_reservation_lines(target_reservation)) loop
      if coalesce(target_line ->> 'inventoryItemId', '') = ''
         or coalesce(target_line ->> 'pickupDate', '') = ''
         or coalesce(target_line ->> 'returnDate', '') = ''
         or (target_line ->> 'returnDate')::date <= (target_line ->> 'pickupDate')::date then
        raise exception using errcode = '22023', message = 'LENA_RESERVATION_DATE_INVALID';
      end if;

      for other_reservation in select value from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations')) loop
        if other_reservation ->> 'id' = target_reservation ->> 'id'
           or coalesce(other_reservation ->> 'status', '') <> all(active_statuses) then
          continue;
        end if;

        for other_line in select value from jsonb_array_elements(private.lena_reservation_lines(other_reservation)) loop
          if other_line ->> 'inventoryItemId' = target_line ->> 'inventoryItemId'
             and (other_line ->> 'pickupDate')::date - before_buffer <= (target_line ->> 'returnDate')::date + after_buffer
             and (target_line ->> 'pickupDate')::date - before_buffer <= (other_line ->> 'returnDate')::date + after_buffer then
            raise exception using errcode = '23505', message = 'LENA_RESERVATION_OVERLAP';
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function private.lena_assert_dress_transitions(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_dress jsonb;
  next_dress jsonb;
  previous_status text;
  next_status text;
begin
  for previous_dress in select value from jsonb_array_elements(private.lena_snapshot_collection(current_snapshot, 'dresses')) loop
    next_dress := private.lena_snapshot_entity(
      private.lena_snapshot_collection(candidate_snapshot, 'dresses'), previous_dress ->> 'id'
    );
    if next_dress is null then
      -- Hard deletion is an exceptional admin-only action for a completely
      -- unreferenced item. A direct patch cannot hide history first because
      -- financial/audit collections are append-only and this command cannot
      -- patch their collections.
      if command_name <> 'inventory.delete'
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations')) row where row ->> 'inventoryItemId' = previous_dress ->> 'id' or row ->> 'dressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'sales')) row where row ->> 'dressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'sale-returns')) row where row ->> 'dressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'payments')) row where row ->> 'dressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'expenses')) row where row ->> 'relatedDressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'delivery-return')) row where row ->> 'inventoryItemId' = previous_dress ->> 'id' or row ->> 'dressCode' = previous_dress ->> 'code')
         or exists (select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'service-tasks')) row where row ->> 'inventoryItemId' = previous_dress ->> 'id' or row ->> 'dressCode' = previous_dress ->> 'code') then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_DELETE_FORBIDDEN';
      end if;
      continue;
    end if;

    if next_dress ->> 'code' is distinct from previous_dress ->> 'code'
       or next_dress ->> 'barcode' is distinct from previous_dress ->> 'barcode' then
      raise exception using errcode = '22023', message = 'LENA_INVENTORY_IDENTITY_IMMUTABLE';
    end if;

    -- An otherwise valid command name must not become a way to overwrite
    -- catalogue price, ownership, images, or lifecycle fields opportunistically.
    -- Each workflow receives only the fields it genuinely owns.
    if command_name = 'inventory.images' then
      if (next_dress - array['images']) <> (previous_dress - array['images']) then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
      end if;
    elsif command_name = 'inventory.archive' then
      if (next_dress - array['status', 'archivedAt']) <> (previous_dress - array['status', 'archivedAt']) then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
      end if;
    elsif command_name = 'design.assign-piece' then
      if (next_dress - array['designId', 'designCode']) <> (previous_dress - array['designId', 'designCode']) then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
      end if;
    elsif command_name in ('delivery.complete', 'reservation.deliverLine') then
      if (next_dress - array['status', 'timesRented']) <> (previous_dress - array['status', 'timesRented']) then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
      end if;
    elsif command_name in (
      'return.complete', 'reservation.returnLine', 'sale.create-invoice',
      'sale.return-line', 'service.open', 'service.complete', 'service.cancel'
    ) then
      if (next_dress - array['status']) <> (previous_dress - array['status']) then
        raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
      end if;
    elsif next_dress <> previous_dress then
      raise exception using errcode = '42501', message = 'LENA_INVENTORY_FIELD_FORBIDDEN';
    end if;

    previous_status := previous_dress ->> 'status';
    next_status := next_dress ->> 'status';
    if previous_status is distinct from next_status and not (
      (previous_status = 'available' and next_status in ('rented', 'sold', 'inactive', 'maintenance', 'inspection'))
      or (previous_status = 'rented' and next_status in ('inspection', 'laundry', 'maintenance', 'damaged', 'inactive'))
      or (previous_status = 'inspection' and next_status in ('available', 'laundry', 'maintenance', 'damaged', 'inactive'))
      or (previous_status = 'laundry' and next_status in ('available', 'maintenance', 'damaged', 'inactive'))
      or (previous_status = 'maintenance' and next_status in ('available', 'damaged', 'inactive'))
      or (previous_status = 'damaged' and next_status in ('maintenance', 'inactive'))
      or (previous_status = 'sold' and next_status in ('inspection', 'inactive'))
      or (previous_status = 'inactive' and next_status = 'available')
    ) then
      raise exception using errcode = '22023', message = 'LENA_INVENTORY_TRANSITION_INVALID';
    end if;

    if previous_status is distinct from next_status then
      if next_status = 'rented' and command_name not in ('delivery.complete', 'reservation.deliverLine') then
        raise exception using errcode = '42501', message = 'LENA_DELIVERY_COMMAND_REQUIRED';
      elsif next_status = 'sold' and command_name <> 'sale.create-invoice' then
        raise exception using errcode = '42501', message = 'LENA_SALE_COMMAND_REQUIRED';
      elsif previous_status = 'sold' and next_status = 'inspection' and command_name <> 'sale.return-line' then
        raise exception using errcode = '42501', message = 'LENA_SALE_RETURN_COMMAND_REQUIRED';
      elsif previous_status = 'rented' and next_status in ('inspection', 'laundry', 'maintenance', 'damaged')
            and command_name not in ('return.complete', 'reservation.returnLine', 'service.open') then
        raise exception using errcode = '42501', message = 'LENA_RETURN_COMMAND_REQUIRED';
      elsif next_status = 'inactive' and command_name not in ('inventory.archive', 'service.complete', 'service.cancel') then
        raise exception using errcode = '42501', message = 'LENA_ARCHIVE_COMMAND_REQUIRED';
      end if;
    end if;
  end loop;

  -- Only inventory/design workflows can add a new physical item. A reservation,
  -- payment, or service command cannot smuggle a new dress into the snapshot.
  if exists (
    select 1
    from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) as candidate_entry(value)
    where private.lena_snapshot_entity(private.lena_snapshot_collection(current_snapshot, 'dresses'), candidate_entry.value ->> 'id') is null
      and command_name not in ('inventory.create', 'design.create', 'design.add-variants')
  ) then
    raise exception using errcode = '42501', message = 'LENA_INVENTORY_CREATE_COMMAND_REQUIRED';
  end if;

  -- Human identifiers remain unique after every command; no client can create
  -- a second item with a reused code/barcode through a direct RPC call.
  if exists (
    select value ->> 'code'
    from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
    group by value ->> 'code'
    having count(*) > 1
  ) or exists (
    select value ->> 'barcode'
    from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
    where coalesce(value ->> 'barcode', '') <> ''
    group by value ->> 'barcode'
    having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'LENA_INVENTORY_CODE_DUPLICATE';
  end if;
end;
$$;

create or replace function private.lena_patch_upserts(patch jsonb, collection_name text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(patch -> 'upserts' -> collection_name) = 'array'
      then patch -> 'upserts' -> collection_name
    else '[]'::jsonb
  end;
$$;

create or replace function private.lena_assert_expense_entity(entity jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(entity ->> 'expenseNumber', '') = ''
     or coalesce(entity ->> 'title', '') = ''
     or coalesce(entity ->> 'expenseDate', '') = ''
     or (entity ->> 'expenseDate')::date > current_date
     or coalesce(entity ->> 'category', '') not in ('laundry', 'tailoring', 'maintenance', 'purchase', 'rent', 'salary', 'other')
     or coalesce(entity ->> 'paymentMethod', '') not in ('cash', 'card', 'bank_transfer', 'other')
     or private.lena_entity_number(entity, 'amount') <= 0 then
    raise exception using errcode = '22023', message = 'LENA_EXPENSE_INVALID';
  end if;
end;
$$;

create or replace function private.lena_assert_critical_command_witnesses(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  patch jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entity jsonb;
  reservation jsonb;
  dress jsonb;
  invoice jsonb;
  sale jsonb;
  line jsonb;
  amount_total numeric;
  related_count integer;
begin
  case command_name
    when 'delivery.complete' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'delivery-return')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'reservations')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_DELIVERY_EVIDENCE_REQUIRED';
      end if;

      for entity in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'delivery-return')) loop
        if entity ->> 'status' is distinct from 'delivered'
           or coalesce(entity ->> 'reservationNumber', '') = ''
           or coalesce(entity ->> 'deliveryDateTime', '') = ''
           or (entity ->> 'deliveryDateTime')::timestamptz > now() then
          raise exception using errcode = '22023', message = 'LENA_DELIVERY_EVIDENCE_INVALID';
        end if;
        reservation := (
          select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'reservations'))
          where value ->> 'reservationNumber' = entity ->> 'reservationNumber'
          limit 1
        );
        if reservation is null
           or reservation ->> 'status' is distinct from 'delivered'
           or coalesce(entity ->> 'inventoryItemId', '') is distinct from reservation ->> 'inventoryItemId'
           or coalesce(entity ->> 'dressCode', '') is distinct from reservation ->> 'dressCode' then
          raise exception using errcode = '22023', message = 'LENA_DELIVERY_RESERVATION_MISMATCH';
        end if;
      end loop;

    when 'return.complete' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'delivery-return')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'reservations')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_RETURN_EVIDENCE_REQUIRED';
      end if;

      for entity in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'delivery-return')) loop
        if coalesce(entity ->> 'status', '') not in ('returned', 'late', 'damaged')
           or coalesce(entity ->> 'reservationNumber', '') = ''
           or coalesce(entity ->> 'returnDateTime', '') = ''
           or (entity ->> 'returnDateTime')::timestamptz > now() then
          raise exception using errcode = '22023', message = 'LENA_RETURN_EVIDENCE_INVALID';
        end if;
        reservation := (
          select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'reservations'))
          where value ->> 'reservationNumber' = entity ->> 'reservationNumber'
          limit 1
        );
        if reservation is null
           or reservation ->> 'status' is distinct from 'returned'
           or coalesce(entity ->> 'inventoryItemId', '') is distinct from reservation ->> 'inventoryItemId'
           or coalesce(entity ->> 'dressCode', '') is distinct from reservation ->> 'dressCode' then
          raise exception using errcode = '22023', message = 'LENA_RETURN_RESERVATION_MISMATCH';
        end if;
      end loop;

    when 'reservation.deliverLine' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'reservations')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_DELIVERY_EVIDENCE_REQUIRED';
      end if;
      if not exists (
        select 1
        from jsonb_array_elements(private.lena_patch_upserts(patch, 'reservations')) reservation_row,
             jsonb_array_elements(private.lena_reservation_lines(reservation_row)) line_row
        where line_row ->> 'deliveryStatus' = 'delivered'
          and coalesce(line_row ->> 'deliveryDateTime', '') <> ''
      ) then
        raise exception using errcode = '22023', message = 'LENA_DELIVERY_EVIDENCE_INVALID';
      end if;

    when 'reservation.returnLine' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'reservations')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_RETURN_EVIDENCE_REQUIRED';
      end if;
      if not exists (
        select 1
        from jsonb_array_elements(private.lena_patch_upserts(patch, 'reservations')) reservation_row,
             jsonb_array_elements(private.lena_reservation_lines(reservation_row)) line_row
        where line_row ->> 'deliveryStatus' = 'returned'
          and coalesce(line_row ->> 'returnDateTime', '') <> ''
      ) then
        raise exception using errcode = '22023', message = 'LENA_RETURN_EVIDENCE_INVALID';
      end if;

    when 'sale.create-invoice' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'sales-invoices')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'sales')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_SALE_EVIDENCE_REQUIRED';
      end if;

      for invoice in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'sales-invoices')) loop
        if coalesce(invoice ->> 'invoiceNumber', '') = ''
           or coalesce(invoice ->> 'customerName', '') = ''
           or coalesce(invoice ->> 'saleDate', '') = ''
           or (invoice ->> 'saleDate')::date > current_date
           or jsonb_typeof(invoice -> 'lines') <> 'array'
           or jsonb_array_length(invoice -> 'lines') = 0 then
          raise exception using errcode = '22023', message = 'LENA_SALE_INVOICE_INVALID';
        end if;
        select coalesce(sum(private.lena_entity_number(line_item, 'amount')), 0)
        into amount_total
        from jsonb_array_elements(invoice -> 'lines') line_item;
        if amount_total <= 0 or abs(amount_total - private.lena_entity_number(invoice, 'totalAmount')) > 0.001 then
          raise exception using errcode = '22023', message = 'LENA_SALE_INVOICE_TOTAL_INVALID';
        end if;
        for line in select value from jsonb_array_elements(invoice -> 'lines') loop
          dress := (
            select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'dresses'))
            where value ->> 'code' = line ->> 'dressCode'
            limit 1
          );
          select count(*) into related_count
          from jsonb_array_elements(private.lena_patch_upserts(patch, 'sales')) sale_row
          where sale_row ->> 'invoiceNumber' = invoice ->> 'invoiceNumber'
            and sale_row ->> 'dressCode' = line ->> 'dressCode'
            and abs(private.lena_entity_number(sale_row, 'amount') - private.lena_entity_number(line, 'amount')) <= 0.001;
          if dress is null or dress ->> 'status' is distinct from 'sold' or related_count <> 1 then
            raise exception using errcode = '22023', message = 'LENA_SALE_LINE_MISMATCH';
          end if;
        end loop;
      end loop;

    when 'sale.return-line' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'sale-returns')) = 0
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) = 0 then
        raise exception using errcode = '42501', message = 'LENA_SALE_RETURN_EVIDENCE_REQUIRED';
      end if;
      for entity in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'sale-returns')) loop
        invoice := (
          select value from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'sales-invoices'))
          where value ->> 'invoiceNumber' = entity ->> 'invoiceNumber'
          limit 1
        );
        dress := (
          select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'dresses'))
          where value ->> 'code' = entity ->> 'dressCode'
          limit 1
        );
        if invoice is null
           or not exists (
             select 1 from jsonb_array_elements(invoice -> 'lines') invoice_line
             where invoice_line ->> 'dressCode' = entity ->> 'dressCode'
           )
           or dress is null
           or dress ->> 'status' is distinct from 'inspection'
           or coalesce(entity ->> 'returnDate', '') = ''
           or (entity ->> 'returnDate')::date > current_date then
          raise exception using errcode = '22023', message = 'LENA_SALE_RETURN_INVALID';
        end if;
      end loop;

    when 'customer.delete' then
      for entity in select value from jsonb_array_elements(coalesce(patch -> 'deletes' -> 'customers', '[]'::jsonb)) loop
        if exists (
          select 1 from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'reservations')) reservation_row
          where reservation_row ->> 'customerId' = entity #>> '{}'
        ) then
          raise exception using errcode = '42501', message = 'LENA_CUSTOMER_DELETE_FORBIDDEN';
        end if;
      end loop;

    when 'expense.post' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'expenses')) <> 1 then
        raise exception using errcode = '22023', message = 'LENA_EXPENSE_COMMAND_REQUIRES_ONE_RECORD';
      end if;
      perform private.lena_assert_expense_entity(private.lena_patch_upserts(patch, 'expenses') -> 0);

    when 'service.open' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      if entity ->> 'status' is distinct from 'open'
         or coalesce(entity ->> 'taskNumber', '') = ''
         or coalesce(entity ->> 'dressCode', '') is distinct from dress ->> 'code'
         or coalesce(entity ->> 'inventoryItemId', '') is distinct from dress ->> 'id'
         or coalesce(dress ->> 'status', '') not in ('inspection', 'laundry', 'maintenance') then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_OPEN_INVALID';
      end if;

    when 'service.start' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1
         or (private.lena_patch_upserts(patch, 'service-tasks') -> 0) ->> 'status' is distinct from 'in_progress' then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_START_INVALID';
      end if;

    when 'service.complete' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      if entity ->> 'status' is distinct from 'completed'
         or coalesce(entity ->> 'completedDate', '') = ''
         or coalesce(entity ->> 'resultingItemStatus', '') is distinct from dress ->> 'status'
         or private.lena_entity_number(entity, 'cost') < 0 then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_COMPLETE_INVALID';
      end if;
      for entity in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'expenses')) loop
        perform private.lena_assert_expense_entity(entity);
      end loop;

    when 'service.cancel' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1
         or jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      if entity ->> 'status' is distinct from 'cancelled'
         or coalesce(entity ->> 'resultingItemStatus', '') is distinct from dress ->> 'status'
         or coalesce(entity ->> 'notes', '') = '' then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_CANCEL_INVALID';
      end if;

    else
      null;
  end case;
end;
$$;

create or replace function private.lena_assert_daily_closing_invariants(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  patch jsonb,
  command_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_close jsonb;
  next_close jsonb;
  close_row jsonb;
begin
  for previous_close in select value from jsonb_array_elements(private.lena_snapshot_collection(current_snapshot, 'daily-closings')) loop
    next_close := private.lena_snapshot_entity(private.lena_snapshot_collection(candidate_snapshot, 'daily-closings'), previous_close ->> 'id');
    if next_close is null then
      raise exception using errcode = '42501', message = 'LENA_DAILY_CLOSE_DELETE_FORBIDDEN';
    end if;
    if next_close <> previous_close then
      if command_name <> 'daily-close.reopen'
         or previous_close ->> 'status' is distinct from 'closed'
         or next_close ->> 'status' is distinct from 'reopened'
         or coalesce(next_close ->> 'reopenReason', '') = ''
         or (next_close - array['status', 'reopenedAt', 'reopenReason']) <> (previous_close - array['status', 'reopenedAt', 'reopenReason']) then
        raise exception using errcode = '42501', message = 'LENA_DAILY_CLOSE_REOPEN_INVALID';
      end if;
    end if;
  end loop;

  for close_row in select value from jsonb_array_elements(private.lena_patch_upserts(patch, 'daily-closings')) loop
    if private.lena_snapshot_entity(private.lena_snapshot_collection(current_snapshot, 'daily-closings'), close_row ->> 'id') is not null then
      continue;
    end if;
    if command_name <> 'daily-close.close'
       or close_row ->> 'status' is distinct from 'closed'
       or coalesce(close_row ->> 'businessDate', '') = ''
       or (close_row ->> 'businessDate')::date > current_date
       or private.lena_entity_number(close_row, 'openingCash') < 0
       or private.lena_entity_number(close_row, 'actualCash') < 0
       or abs(private.lena_entity_number(close_row, 'difference') - (private.lena_entity_number(close_row, 'actualCash') - private.lena_entity_number(close_row, 'expectedCash'))) > 0.001
       or jsonb_typeof(close_row -> 'breakdown') is distinct from 'object'
       or exists (
         select 1
         from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'daily-closings')) existing
         where existing ->> 'businessDate' = close_row ->> 'businessDate'
           and existing ->> 'id' <> close_row ->> 'id'
       ) then
      raise exception using errcode = '22023', message = 'LENA_DAILY_CLOSE_INVALID';
    end if;
  end loop;
end;
$$;

create or replace function private.lena_assert_command_authority(
  current_snapshot jsonb,
  candidate_snapshot jsonb,
  command_name text,
  patch jsonb,
  actor_is_admin boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  section text;
  collection_name text;
  allowed_collections text[];
  protected_collection text;
begin
  if not private.lena_known_command(command_name) then
    raise exception using errcode = '22023', message = 'LENA_UNKNOWN_COMMAND';
  end if;
  if command_name in ('database.import', 'database.reset') then
    raise exception using errcode = '42501', message = 'LENA_ADMIN_RECOVERY_RPC_REQUIRED';
  end if;

  if jsonb_typeof(patch) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(patch) key
       where key not in ('upserts', 'deletes', 'replacements')
     ) then
    raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_PATCH';
  end if;

  allowed_collections := private.lena_command_collections(command_name);

  -- Client-authored audit, command log and legacy audit collections never cross
  -- this boundary. The server adds one actor-bound audit record after validating
  -- the command, so direct RPC callers cannot forge or erase history.
  foreach protected_collection in array array['audit-log', 'audit', 'command-log'] loop
    if (patch -> 'upserts') ? protected_collection
       or (patch -> 'deletes') ? protected_collection
       or (patch -> 'replacements') ? protected_collection then
      raise exception using errcode = '42501', message = 'LENA_SERVER_AUDIT_REQUIRED';
    end if;
  end loop;

  foreach section in array array['upserts', 'deletes', 'replacements'] loop
    if patch ? section then
      if jsonb_typeof(patch -> section) <> 'object' then
        raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_PATCH';
      end if;
      for collection_name in select key from jsonb_object_keys(patch -> section) key loop
        if not private.lena_known_collection(collection_name)
           or not collection_name = any (allowed_collections) then
          raise exception using errcode = '42501', message = 'LENA_COMMAND_COLLECTION_FORBIDDEN';
        end if;
      end loop;
    end if;
  end loop;

  if not actor_is_admin then
    if command_name in (
      'preferences.save', 'profile.save', 'profile.reset',
      'print-settings.save', 'print-settings.reset',
      'message-templates.save', 'message-templates.reset',
      'database.reset', 'database.import', 'storage.migrate-images',
      'inventory.delete', 'customer.delete'
    ) or (patch ? 'replacements') then
      raise exception using errcode = '42501', message = 'LENA_ADMIN_REQUIRED';
    end if;
  end if;

  -- Financial records and history are immutable after posting for every role.
  foreach protected_collection in array array[
    'payments', 'expenses', 'sales', 'sales-invoices', 'sale-returns',
    'audit-log', 'audit'
  ] loop
    perform private.lena_assert_append_only(current_snapshot, candidate_snapshot, protected_collection);
  end loop;

  perform private.lena_assert_new_payment_records(current_snapshot, candidate_snapshot, command_name);
  perform private.lena_assert_reservation_transitions(current_snapshot, candidate_snapshot, command_name);
  perform private.lena_assert_reservation_financials(current_snapshot, candidate_snapshot, patch);
  perform private.lena_assert_reservation_availability(candidate_snapshot, patch, command_name);
  perform private.lena_assert_dress_transitions(current_snapshot, candidate_snapshot, command_name);
  perform private.lena_assert_critical_command_witnesses(current_snapshot, candidate_snapshot, patch, command_name);
  perform private.lena_assert_daily_closing_invariants(current_snapshot, candidate_snapshot, patch, command_name);
end;
$$;

-- ── Patch application and server-owned audit ────────────────────────────────

create or replace function private.lena_apply_command_patch(current_snapshot jsonb, patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate jsonb := current_snapshot;
  collection_name text;
  entity jsonb;
  entity_id text;
  items jsonb;
  delete_id jsonb;
begin
  for collection_name in select key from jsonb_object_keys(coalesce(patch -> 'upserts', '{}'::jsonb)) key loop
    if jsonb_typeof(patch -> 'upserts' -> collection_name) <> 'array' then
      raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_PATCH';
    end if;
    items := private.lena_snapshot_collection(candidate, collection_name);
    for entity in select value from jsonb_array_elements(patch -> 'upserts' -> collection_name) loop
      if jsonb_typeof(entity) <> 'object' or coalesce(entity ->> 'id', '') = '' then
        raise exception using errcode = '22023', message = 'LENA_PATCH_ENTITY_ID_REQUIRED';
      end if;
      items := private.lena_replace_snapshot_entity(items, entity);
    end loop;
    candidate := jsonb_set(candidate, array['collections', collection_name], items, true);
  end loop;

  for collection_name in select key from jsonb_object_keys(coalesce(patch -> 'deletes', '{}'::jsonb)) key loop
    if jsonb_typeof(patch -> 'deletes' -> collection_name) <> 'array' then
      raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_PATCH';
    end if;
    items := private.lena_snapshot_collection(candidate, collection_name);
    for delete_id in select value from jsonb_array_elements(patch -> 'deletes' -> collection_name) loop
      if jsonb_typeof(delete_id) <> 'string' or delete_id #>> '{}' = '' then
        raise exception using errcode = '22023', message = 'LENA_PATCH_DELETE_ID_REQUIRED';
      end if;
      items := private.lena_remove_snapshot_entity(items, delete_id #>> '{}');
    end loop;
    candidate := jsonb_set(candidate, array['collections', collection_name], items, true);
  end loop;

  for collection_name in select key from jsonb_object_keys(coalesce(patch -> 'replacements', '{}'::jsonb)) key loop
    items := patch -> 'replacements' -> collection_name;
    if jsonb_typeof(items) <> 'array' then
      raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_REPLACEMENT';
    end if;
    candidate := jsonb_set(candidate, array['collections', collection_name], items, true);
  end loop;

  return candidate;
end;
$$;

create or replace function private.lena_append_server_audit(
  snapshot jsonb,
  actor uuid,
  command_name text,
  resulting_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  audit_entry jsonb;
  audit_items jsonb;
begin
  select full_name into actor_name from public.profiles where id = actor;
  audit_entry := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'timestamp', now(),
    'performedBy', coalesce(actor_name, 'مستخدم موثّق'),
    'action', 'update',
    'entityType', 'database',
    'entityId', command_name,
    'summary', 'تم اعتماد العملية المؤمّنة ' || command_name || ' من الخادم.',
    'nextValues', jsonb_build_object('commandName', command_name, 'revision', resulting_revision, 'actorId', actor::text)
  );
  audit_items := private.lena_snapshot_collection(snapshot, 'audit-log') || jsonb_build_array(audit_entry);
  return jsonb_set(snapshot, '{collections,audit-log}', audit_items, true);
end;
$$;

-- Private helpers must not become callable merely because the existing private
-- schema is usable by authenticated roles for RLS predicates.
revoke all on function private.lena_snapshot_collection(jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_snapshot_entity(jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_replace_snapshot_entity(jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.lena_remove_snapshot_entity(jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_json_number(jsonb, numeric) from public, anon, authenticated;
revoke all on function private.lena_entity_number(jsonb, text, numeric) from public, anon, authenticated;
revoke all on function private.lena_known_collection(text) from public, anon, authenticated;
revoke all on function private.lena_known_command(text) from public, anon, authenticated;
revoke all on function private.lena_command_collections(text) from public, anon, authenticated;
revoke all on function private.lena_assert_append_only(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_new_payment_records(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_reservation_financials(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.lena_assert_reservation_transitions(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_reservation_lines(jsonb) from public, anon, authenticated;
revoke all on function private.lena_assert_reservation_availability(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_dress_transitions(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_patch_upserts(jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_expense_entity(jsonb) from public, anon, authenticated;
revoke all on function private.lena_assert_critical_command_witnesses(jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_daily_closing_invariants(jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_command_authority(jsonb, jsonb, text, jsonb, boolean) from public, anon, authenticated;
revoke all on function private.lena_apply_command_patch(jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.lena_append_server_audit(jsonb, uuid, text, bigint) from public, anon, authenticated;

-- ── Public authority surface ────────────────────────────────────────────────

create or replace function public.apply_showroom_command(
  p_expected_revision bigint,
  p_command_name text,
  p_idempotency_key text,
  p_patch jsonb
)
returns table (revision bigint, applied boolean, snapshot jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_revision bigint;
  existing_revision bigint;
  next_revision bigint;
  current_snapshot jsonb;
  candidate_snapshot jsonb;
  actor_is_admin boolean;
begin
  if actor is null or not private.is_active_lena_user() then
    raise exception using errcode = '42501', message = 'LENA_AUTH_REQUIRED';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_IDENTITY';
  end if;
  if p_patch is null then
    raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_PATCH';
  end if;
  if octet_length(p_patch::text) > 20971520 then
    raise exception using errcode = '22023', message = 'LENA_SNAPSHOT_TOO_LARGE';
  end if;

  select resulting_revision into existing_revision
  from public.showroom_mutations
  where actor_id = actor and idempotency_key = p_idempotency_key;
  if found then
    -- Return the current revision with the current state. A command may be
    -- replayed after another device has progressed the showroom, and returning
    -- the historical revision would create a false conflict on the next write.
    select s.revision, s.snapshot
    into current_revision, current_snapshot
    from public.showroom_state s
    where s.id = 'main';
    return query select current_revision, false, current_snapshot;
    return;
  end if;

  select s.revision, s.snapshot
  into current_revision, current_snapshot
  from public.showroom_state s
  where s.id = 'main'
  for update;

  if current_revision is distinct from p_expected_revision then
    raise exception using errcode = '40001', message = 'LENA_REVISION_CONFLICT';
  end if;

  candidate_snapshot := private.lena_apply_command_patch(current_snapshot, p_patch);
  actor_is_admin := private.is_lena_admin();
  perform private.lena_assert_command_authority(
    current_snapshot,
    candidate_snapshot,
    p_command_name,
    p_patch,
    actor_is_admin
  );

  next_revision := current_revision + 1;
  candidate_snapshot := private.lena_append_server_audit(candidate_snapshot, actor, p_command_name, next_revision);

  update public.showroom_state
  set snapshot = candidate_snapshot,
      revision = next_revision,
      updated_at = now(),
      updated_by = actor
  where id = 'main';

  -- Keep the public catalogue projection in the same atomic database command.
  delete from public.catalogue_items;
  insert into public.catalogue_items (
    id, code, name, description, category, color, size, item_type,
    rental_price, sale_price, security_deposit_amount, status,
    is_for_rent, is_for_sale, images, updated_at
  )
  select
    item ->> 'id', item ->> 'code', item ->> 'name', item ->> 'description',
    item ->> 'category', item ->> 'color', item ->> 'size', coalesce(item ->> 'itemType', 'dress'),
    coalesce(nullif(item ->> 'rentalPrice', '')::numeric, 0),
    coalesce(nullif(item ->> 'salePrice', '')::numeric, 0),
    coalesce(nullif(coalesce(item ->> 'defaultSecurityDepositAmount', item ->> 'depositAmount'), '')::numeric, 0),
    coalesce(item ->> 'status', 'inactive'),
    coalesce((item ->> 'isForRent')::boolean, true),
    coalesce((item ->> 'isForSale')::boolean, false),
    case when jsonb_typeof(item -> 'images') = 'array' then item -> 'images' else '[]'::jsonb end,
    now()
  from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) item;

  insert into public.showroom_mutations (actor_id, idempotency_key, command_name, resulting_revision)
  values (actor, p_idempotency_key, p_command_name, next_revision);

  return query select next_revision, true, candidate_snapshot;
end;
$$;

revoke all on function public.apply_showroom_command(bigint, text, text, jsonb) from public, anon;
grant execute on function public.apply_showroom_command(bigint, text, text, jsonb) to authenticated;

-- Disable the legacy full snapshot writer. Revocation alone is fragile because
-- future grants can re-open it; a deliberate call now fails closed as well.
create or replace function public.apply_showroom_snapshot(
  p_expected_revision bigint,
  p_snapshot jsonb,
  p_idempotency_key text,
  p_command_name text
)
returns table (revision bigint, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'LENA_LEGACY_SNAPSHOT_WRITE_DISABLED';
end;
$$;

revoke all on function public.apply_showroom_snapshot(bigint, jsonb, text, text)
from public, anon, authenticated, service_role;

-- ── Explicit admin-only recovery commands ───────────────────────────────────
-- These are deliberately separate from the normal command patch boundary. A
-- backup restore/reset is an explicit, auditable recovery operation, not a
-- generic state-write capability available to operational staff.

create or replace function private.lena_rebuild_catalogue_from_snapshot(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.catalogue_items;
  insert into public.catalogue_items (
    id, code, name, description, category, color, size, item_type,
    rental_price, sale_price, security_deposit_amount, status,
    is_for_rent, is_for_sale, images, updated_at
  )
  select
    item ->> 'id', item ->> 'code', item ->> 'name', item ->> 'description',
    item ->> 'category', item ->> 'color', item ->> 'size', coalesce(item ->> 'itemType', 'dress'),
    coalesce(nullif(item ->> 'rentalPrice', '')::numeric, 0),
    coalesce(nullif(item ->> 'salePrice', '')::numeric, 0),
    coalesce(nullif(coalesce(item ->> 'defaultSecurityDepositAmount', item ->> 'depositAmount'), '')::numeric, 0),
    coalesce(item ->> 'status', 'inactive'),
    coalesce((item ->> 'isForRent')::boolean, true),
    coalesce((item ->> 'isForSale')::boolean, false),
    case when jsonb_typeof(item -> 'images') = 'array' then item -> 'images' else '[]'::jsonb end,
    now()
  from jsonb_array_elements(private.lena_snapshot_collection(snapshot, 'dresses')) item;
end;
$$;

revoke all on function private.lena_rebuild_catalogue_from_snapshot(jsonb) from public, anon, authenticated;

create or replace function public.restore_showroom_backup(
  p_expected_revision bigint,
  p_idempotency_key text,
  p_snapshot jsonb
)
returns table (revision bigint, applied boolean, snapshot jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_revision bigint;
  existing_revision bigint;
  current_snapshot jsonb;
  restored_snapshot jsonb;
  next_revision bigint;
begin
  if actor is null or not private.is_lena_admin() then
    raise exception using errcode = '42501', message = 'LENA_ADMIN_REQUIRED';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_IDENTITY';
  end if;
  if p_snapshot is null
     or jsonb_typeof(p_snapshot) <> 'object'
     or p_snapshot ->> 'applicationId' is distinct from 'dress-roomshow'
     or jsonb_typeof(p_snapshot -> 'collections') <> 'object'
     or octet_length(p_snapshot::text) > 20971520 then
    raise exception using errcode = '22023', message = 'LENA_INVALID_BACKUP_RESTORE';
  end if;

  select resulting_revision into existing_revision
  from public.showroom_mutations
  where actor_id = actor and idempotency_key = p_idempotency_key;
  if found then
    select s.revision, s.snapshot into current_revision, current_snapshot
    from public.showroom_state s where s.id = 'main';
    return query select current_revision, false, current_snapshot;
    return;
  end if;

  select s.revision, s.snapshot into current_revision, current_snapshot
  from public.showroom_state s where s.id = 'main' for update;
  if current_revision is distinct from p_expected_revision then
    raise exception using errcode = '40001', message = 'LENA_REVISION_CONFLICT';
  end if;

  next_revision := current_revision + 1;
  restored_snapshot := private.lena_append_server_audit(p_snapshot, actor, 'database.import', next_revision);

  -- The existing snapshot validation trigger verifies every required collection
  -- and entity shape before this transaction can commit.
  update public.showroom_state
  set snapshot = restored_snapshot,
      revision = next_revision,
      updated_at = now(),
      updated_by = actor
  where id = 'main';

  perform private.lena_rebuild_catalogue_from_snapshot(restored_snapshot);
  insert into public.showroom_mutations (actor_id, idempotency_key, command_name, resulting_revision)
  values (actor, p_idempotency_key, 'database.import', next_revision);

  return query select next_revision, true, restored_snapshot;
end;
$$;

revoke all on function public.restore_showroom_backup(bigint, text, jsonb) from public, anon;
grant execute on function public.restore_showroom_backup(bigint, text, jsonb) to authenticated;

create or replace function public.reset_showroom_state(
  p_expected_revision bigint,
  p_idempotency_key text
)
returns table (revision bigint, applied boolean, snapshot jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_revision bigint;
  existing_revision bigint;
  current_snapshot jsonb;
  reset_snapshot jsonb;
  next_revision bigint;
  collection_name text;
begin
  if actor is null or not private.is_lena_admin() then
    raise exception using errcode = '42501', message = 'LENA_ADMIN_REQUIRED';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'LENA_INVALID_COMMAND_IDENTITY';
  end if;

  select resulting_revision into existing_revision
  from public.showroom_mutations
  where actor_id = actor and idempotency_key = p_idempotency_key;
  if found then
    select s.revision, s.snapshot into current_revision, current_snapshot
    from public.showroom_state s where s.id = 'main';
    return query select current_revision, false, current_snapshot;
    return;
  end if;

  select s.revision, s.snapshot into current_revision, current_snapshot
  from public.showroom_state s where s.id = 'main' for update;
  if current_revision is distinct from p_expected_revision then
    raise exception using errcode = '40001', message = 'LENA_REVISION_CONFLICT';
  end if;

  reset_snapshot := jsonb_set(current_snapshot, '{migrationMarkers}', '{}'::jsonb, true);
  foreach collection_name in array array[
    'customers', 'dresses', 'dress-designs', 'accessories', 'reservation-accessories',
    'reservations', 'appointments', 'payments', 'expenses', 'delivery-return',
    'sales', 'sales-invoices', 'sale-returns', 'service-tasks', 'audit-log',
    'audit', 'daily-closings', 'counters', 'command-log', 'reminder-dismissals',
    'operators', 'customer-conduct-notes', 'waitlist', 'print-settings',
    'retired-codes', 'preferences', 'showroom-profile', 'stocktake-sessions',
    'message-templates', 'images'
  ] loop
    reset_snapshot := jsonb_set(reset_snapshot, array['collections', collection_name], '[]'::jsonb, true);
  end loop;

  next_revision := current_revision + 1;
  reset_snapshot := private.lena_append_server_audit(reset_snapshot, actor, 'database.reset', next_revision);

  update public.showroom_state
  set snapshot = reset_snapshot,
      revision = next_revision,
      updated_at = now(),
      updated_by = actor
  where id = 'main';

  perform private.lena_rebuild_catalogue_from_snapshot(reset_snapshot);
  insert into public.showroom_mutations (actor_id, idempotency_key, command_name, resulting_revision)
  values (actor, p_idempotency_key, 'database.reset', next_revision);

  return query select next_revision, true, reset_snapshot;
end;
$$;

revoke all on function public.reset_showroom_state(bigint, text) from public, anon;
grant execute on function public.reset_showroom_state(bigint, text) to authenticated;
