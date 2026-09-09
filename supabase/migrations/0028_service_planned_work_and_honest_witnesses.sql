-- Service work: honest witnesses, and planned work that keeps the piece sellable.
--
-- Two operator workflows were impossible, both rejected server-side after the
-- browser had already committed locally, so the app rolled the work back and
-- told the owner nothing had been saved:
--
-- 1. LENA_SERVICE_EVIDENCE_REQUIRED (42501). `service.open`, `service.complete`
--    and `service.cancel` demanded exactly one `dresses` upsert in the patch.
--    When the command does not actually move the item — completing a
--    maintenance task as "still needs maintenance", or cancelling a task that
--    was planned but never started — there is no dress upsert to show, and the
--    command was rejected for missing evidence that cannot exist. The item is
--    now read from the authoritative snapshot when the patch carries none, and
--    the identity/state checks run against that witness instead.
--
-- 2. A task planned for a future date took the piece off the shelf the moment
--    it was opened, so it could not be rented in the days before the work was
--    due. `service.open` now accepts an `available` item when the task starts
--    on a later day, and `service.start` is the command that withdraws it.
--    `lena_assert_dress_transitions` is restated to let `service.start` own the
--    item status, which it never needed before.

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
      'sale.return-line', 'service.open', 'service.start',
      'service.complete', 'service.cancel'
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
      (previous_status = 'available' and next_status in ('rented', 'sold', 'inactive', 'maintenance', 'inspection', 'laundry'))
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

CREATE OR REPLACE FUNCTION private.lena_assert_critical_command_witnesses(current_snapshot jsonb, candidate_snapshot jsonb, patch jsonb, command_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      -- The item is the second witness, but it is legitimately absent from the
      -- patch when the command did not have to move it: the item already sits
      -- in the state this work produces (a reopened or re-queued task), or the
      -- work is planned for a later day and the item stays on the shelf until
      -- it starts. The authoritative snapshot is then the only honest witness.
      if jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) >= 1 then
        dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      else
        select value into dress
          from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
         where value ->> 'id' = entity ->> 'inventoryItemId'
         limit 1;
      end if;
      if dress is null then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      if entity ->> 'status' is distinct from 'open'
         or coalesce(entity ->> 'taskNumber', '') = ''
         or coalesce(entity ->> 'dressCode', '') is distinct from dress ->> 'code'
         or coalesce(entity ->> 'inventoryItemId', '') is distinct from dress ->> 'id'
         or (
           coalesce(dress ->> 'status', '') not in ('inspection', 'laundry', 'maintenance')
           -- Work planned for a future date leaves the piece rentable until the
           -- day it starts; demanding a service state here would cost the
           -- showroom the item for every day between planning and the work.
           and not (
             coalesce(dress ->> 'status', '') = 'available'
             and nullif(entity ->> 'startDate', '') is not null
             and (entity ->> 'startDate')::date > current_date
           )
         ) then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_OPEN_INVALID';
      end if;

    when 'service.start' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1
         or (private.lena_patch_upserts(patch, 'service-tasks') -> 0) ->> 'status' is distinct from 'in_progress' then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_START_INVALID';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      -- Starting the work is the moment the piece leaves the shelf, whether the
      -- task was planned ahead or opened on the spot: the item must be in a
      -- service state once the command is applied.
      select value into dress
        from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
       where value ->> 'code' = entity ->> 'dressCode'
       limit 1;
      if coalesce(dress ->> 'status', '') not in ('inspection', 'laundry', 'maintenance') then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_START_INVALID';
      end if;

    when 'service.complete' then
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      -- The item is unchanged when the operator confirms the state it already
      -- has ("still needs maintenance"): there is no dress upsert to show, and
      -- the authoritative snapshot is the witness instead.
      if jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) >= 1 then
        dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      else
        select value into dress
          from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
         where value ->> 'code' = entity ->> 'dressCode'
         limit 1;
      end if;
      if dress is null then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
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
      if jsonb_array_length(private.lena_patch_upserts(patch, 'service-tasks')) <> 1 then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      entity := private.lena_patch_upserts(patch, 'service-tasks') -> 0;
      -- A task that was planned but never started never moved the item, so
      -- cancelling it produces no dress upsert either.
      if jsonb_array_length(private.lena_patch_upserts(patch, 'dresses')) >= 1 then
        dress := private.lena_patch_upserts(patch, 'dresses') -> 0;
      else
        select value into dress
          from jsonb_array_elements(private.lena_snapshot_collection(candidate_snapshot, 'dresses')) value
         where value ->> 'code' = entity ->> 'dressCode'
         limit 1;
      end if;
      if dress is null then
        raise exception using errcode = '42501', message = 'LENA_SERVICE_EVIDENCE_REQUIRED';
      end if;
      if entity ->> 'status' is distinct from 'cancelled'
         or coalesce(entity ->> 'resultingItemStatus', '') is distinct from dress ->> 'status'
         or coalesce(entity ->> 'notes', '') = '' then
        raise exception using errcode = '22023', message = 'LENA_SERVICE_CANCEL_INVALID';
      end if;

    else
      null;
  end case;
end;
$function$;

revoke all on function private.lena_assert_dress_transitions(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function private.lena_assert_critical_command_witnesses(jsonb, jsonb, jsonb, text) from public, anon, authenticated;
