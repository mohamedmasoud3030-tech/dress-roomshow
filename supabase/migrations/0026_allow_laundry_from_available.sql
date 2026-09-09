-- Allow a shelf-ready piece to be sent straight to the laundry.
--
-- `service.open` maps the service type "laundry" to the dress status "laundry",
-- but the authoritative transition matrix only permitted `available` ->
-- ('rented', 'sold', 'inactive', 'maintenance', 'inspection'). Opening a laundry
-- task on an available dress was therefore rejected with
-- LENA_INVENTORY_TRANSITION_INVALID (22023), which made the single most common
-- service operation in a dress showroom impossible from the UI. That is a real
-- operator workflow: a piece resting on the shelf often needs cleaning before
-- its next rental.
--
-- This migration restates private.lena_assert_dress_transitions verbatim with
-- `laundry` added to the statuses reachable from `available`.

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
