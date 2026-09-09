-- Project the per-piece discount into the public catalogue on every write.
--
-- Two functions rebuild `catalogue_items` from the authoritative snapshot:
-- `lena_rebuild_catalogue_from_snapshot` (full rebuild, fixed in 0030) and
-- `lena_sync_catalogue_from_snapshot` (incremental, called by
-- `apply_showroom_command` on every command). Only the first one was updated,
-- so the discount saved on a piece reached the snapshot and then stopped there:
-- the landing page, which reads `catalogue_items`, still advertised the old
-- price while the app showed the new one.
--
-- The value is clamped to the column's 0-100 range on the way in. A projection
-- is not the place to fail a command: one bad number in a snapshot would
-- otherwise block every later write for the whole showroom.

create or replace function private.lena_sync_catalogue_from_snapshot(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_ids text[];
begin
  select coalesce(array_agg(ci.id), '{}'::text[])
  into stale_ids
  from public.catalogue_items ci
  where ci.id not in (
    select item ->> 'id'
    from jsonb_array_elements(private.lena_snapshot_collection(snapshot, 'dresses')) item
    where item ->> 'id' is not null
  );

  delete from public.catalogue_items where id = any(stale_ids);

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
  from jsonb_array_elements(private.lena_snapshot_collection(snapshot, 'dresses')) item
  where item ->> 'id' is not null
  on conflict (id) do update
  set code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      color = excluded.color,
      size = excluded.size,
      item_type = excluded.item_type,
      rental_price = excluded.rental_price,
      sale_price = excluded.sale_price,
      security_deposit_amount = excluded.security_deposit_amount,
      status = excluded.status,
      is_for_rent = excluded.is_for_rent,
      is_for_sale = excluded.is_for_sale,
      discount_percent = excluded.discount_percent,
      images = excluded.images,
      updated_at = excluded.updated_at;
end;
$$;
