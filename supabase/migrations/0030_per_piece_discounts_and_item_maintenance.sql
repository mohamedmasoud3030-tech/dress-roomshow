-- Per-piece discounts, and the ability to maintain a piece after adding it.
--
-- A showroom puts a piece on sale for a season: the customer sees the old
-- price struck through and the new one next to it. The discount lives on the
-- piece itself, because that is how the owner thinks about it — "this one is
-- 20% off", not "this category is 20% off".
--
-- The public catalogue projection gains `discount_percent` and is rebuilt from
-- the snapshot with it.
--
-- `inventory.update` is the new command behind the item editor. Before it, the
-- only commands that could touch a dress were create / archive / delete /
-- images, so a piece could never be renamed, repriced or discounted after it
-- was added: editing saved locally and was silently overwritten by the next
-- cloud hydration. The command owns the commercial fields only — identity,
-- lifecycle counters, images, design links and status remain with their own
-- commands.

alter table public.catalogue_items
  add column if not exists discount_percent numeric(6,3) not null default 0
  check (discount_percent >= 0 and discount_percent <= 100);

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
    is_for_rent, is_for_sale, discount_percent, images, updated_at
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
    greatest(0, least(100, coalesce(nullif(item ->> 'discountPercent', '')::numeric, 0))),
    case when jsonb_typeof(item -> 'images') = 'array' then item -> 'images' else '[]'::jsonb end,
    now()
  from jsonb_array_elements(private.lena_snapshot_collection(snapshot, 'dresses')) item;
end;
$$;

revoke all on function private.lena_rebuild_catalogue_from_snapshot(jsonb) from public, anon, authenticated;

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
    elsif command_name = 'inventory.update' then
      -- A piece the showroom already owns must stay editable: names drift,
      -- prices are renegotiated, and a sale is put on a piece for a season.
      -- Identity, lifecycle and evidence fields stay out of reach, and the
      -- status still may not change here (it has its own commands).
      if (next_dress - array[
        'name', 'category', 'color', 'size', 'description',
        'rentalPrice', 'salePrice', 'defaultSecurityDepositAmount', 'depositAmount',
        'isForRent', 'isForSale', 'discountPercent', 'notes'
      ]) <> (previous_dress - array[
        'name', 'category', 'color', 'size', 'description',
        'rentalPrice', 'salePrice', 'defaultSecurityDepositAmount', 'depositAmount',
        'isForRent', 'isForSale', 'discountPercent', 'notes'
      ]) then
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
      or (previous_status = 'laundry' and next_status in ('available', 'inspection', 'maintenance', 'damaged', 'inactive'))
      or (previous_status = 'maintenance' and next_status in ('available', 'inspection', 'laundry', 'damaged', 'inactive'))
      or (previous_status = 'damaged' and next_status in ('inspection', 'maintenance', 'inactive'))
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

revoke all on function private.lena_assert_dress_transitions(jsonb, jsonb, text) from public, anon, authenticated;
