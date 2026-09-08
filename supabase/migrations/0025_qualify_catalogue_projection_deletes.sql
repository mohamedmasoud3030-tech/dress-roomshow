-- 0025_qualify_catalogue_projection_deletes
--
-- Forward-only repair. Every command written through
-- public.apply_showroom_command() ends by rebuilding the public catalogue
-- projection, and that rebuild used an unqualified `delete from
-- public.catalogue_items`. The database rejects an unqualified DELETE for
-- operational sessions, so *every* write from the app failed with
--
--   21000: DELETE requires a WHERE clause
--
-- while the same statement succeeded when executed by a superuser. The
-- showroom was therefore read-only for its own staff: no profile, dress,
-- customer, reservation or payment could be saved, and the public landing
-- profile stayed empty because `profile.save` never reached the snapshot.
--
-- The projection is now reconciled by key: rows that left the snapshot are
-- deleted through an equality on the primary key, and current rows are
-- upserted in place. That is both acceptable to the guard and cheaper than
-- deleting and reinserting the whole catalogue on every command.

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
      images = excluded.images,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function private.lena_sync_catalogue_from_snapshot(jsonb) from public, anon, authenticated;

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
  perform private.lena_sync_catalogue_from_snapshot(candidate_snapshot);

  insert into public.showroom_mutations (actor_id, idempotency_key, command_name, resulting_revision)
  values (actor, p_idempotency_key, p_command_name, next_revision);

  return query select next_revision, true, candidate_snapshot;
end;
$$;
revoke all on function public.apply_showroom_command(bigint, text, text, jsonb) from public, anon;
grant execute on function public.apply_showroom_command(bigint, text, text, jsonb) to authenticated;

revoke all on function private.lena_rebuild_catalogue_from_snapshot(jsonb) from public, anon, authenticated;

create or replace function private.lena_rebuild_catalogue_from_snapshot(snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.lena_sync_catalogue_from_snapshot(snapshot);
end;
$$;
