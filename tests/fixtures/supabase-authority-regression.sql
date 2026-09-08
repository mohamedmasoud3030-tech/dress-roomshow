\set ON_ERROR_STOP on

-- This fixture runs only against a disposable database created by
-- scripts/verify-clean-supabase-schema.sh. IDs and data are synthetic.

-- P0-A: two sign-ups before owner provisioning never receive authority.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'candidate-one@example.test', '{"full_name":"Candidate one"}'),
  ('10000000-0000-4000-8000-000000000002', 'candidate-two@example.test', '{"full_name":"Candidate two"}');

do $$
begin
  if exists (select 1 from public.profiles where role = 'admin' or is_active) then
    raise exception 'TEST: untrusted signup acquired authority';
  end if;
  if (select count(*) from public.profiles where role = 'staff' and not is_active) <> 4 then
    raise exception 'TEST: concurrent/signup profiles are not inactive staff';
  end if;
end;
$$;

-- The only SECURITY DEFINER function executable by a normal authenticated role
-- is the constrained command boundary. Trigger helpers and legacy writers are
-- not alternate RPCs.
do $$
begin
  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and has_function_privilege('authenticated', procedure.oid, 'execute')
      and procedure.proname not in ('apply_showroom_command', 'restore_showroom_backup', 'reset_showroom_state')
  ) then
    raise exception 'TEST: unexpected authenticated SECURITY DEFINER RPC exists';
  end if;
end;
$$;

-- Every SECURITY DEFINER function in the authority surface is owned by the
-- trusted migration owner in this clean schema. The deployment runbook repeats
-- this as a read-only linked-project check before cutover.
do $$
begin
  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.prosecdef
      and pg_get_userbyid(procedure.proowner) <> 'postgres'
  ) then
    raise exception 'TEST: SECURITY DEFINER owner is not postgres';
  end if;
end;
$$;

-- An authenticated normal user cannot call the private owner bootstrap path.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    perform private.bootstrap_lena_owner('10000000-0000-4000-8000-000000000001');
    raise exception 'TEST: authenticated user invoked private owner bootstrap';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
rollback;

-- Trusted recovery bootstraps exactly the nominated owner. A repeated call is
-- idempotent; a competing second candidate cannot become a second bootstrap.
select (private.bootstrap_lena_owner('10000000-0000-4000-8000-000000000001')).id;
select (private.bootstrap_lena_owner('10000000-0000-4000-8000-000000000001')).id;
do $$
begin
  begin
    perform private.bootstrap_lena_owner('10000000-0000-4000-8000-000000000002');
    raise exception 'TEST: competing bootstrap unexpectedly succeeded';
  exception when insufficient_privilege then
    if position('LENA_OWNER_ALREADY_BOOTSTRAPPED' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

-- Cascading deletion of the Auth owner is another path to profiles deletion;
-- the last-admin trigger must stop it as well.
do $$
begin
  begin
    delete from auth.users where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'TEST: cascading Auth-user deletion removed the final admin';
  exception when check_violation then
    if position('LENA_LAST_ACTIVE_ADMIN_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

-- Provision a legitimate active staff account through the existing owner.
insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000003', 'staff@example.test', '{"full_name":"Staff operator"}');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
update public.profiles set is_active = true where id = '10000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub', '', false);

-- P0-B: a normal active staff member can execute valid narrow domain commands.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select revision from public.apply_showroom_command(
  0, 'inventory.create', 'fixture-inventory-create-001',
  '{"upserts":{"dresses":[{"id":"dress-1","code":"DR-001","barcode":"DR-001","name":"Test dress","status":"available","rentalPrice":100,"salePrice":0,"defaultSecurityDepositAmount":20,"isForRent":true,"isForSale":false,"images":[]}]}}'::jsonb
);
select revision from public.apply_showroom_command(
  1, 'customer.create', 'fixture-customer-create-001',
  '{"upserts":{"customers":[{"id":"customer-1","name":"Test customer","phone":"90000000","status":"normal"}]}}'::jsonb
);
select revision from public.apply_showroom_command(
  2, 'reservation.create', 'fixture-reservation-create-001',
  '{"upserts":{"reservations":[{"id":"reservation-1","reservationNumber":"RSV-1","customerId":"customer-1","inventoryItemId":"dress-1","customerName":"Test customer","customerPhone":"90000000","customerNameSnapshot":"Test customer","customerPhoneSnapshot":"90000000","dressCode":"DR-001","dressName":"Test dress","dressCodeSnapshot":"DR-001","dressNameSnapshot":"Test dress","pickupDate":"2026-08-23","returnDate":"2026-08-25","status":"confirmed","rentalPrice":100,"securityDepositAmount":20,"bookingAdvanceAmount":0,"bookingAdvanceCollectedAmount":0,"rentalCollectedAmount":0,"securityDepositCollectedAmount":0,"securityDepositRefundedAmount":0,"securityDepositRetainedAmount":0,"rentalRefundedAmount":0,"totalAmount":120,"paidAmount":0,"remainingAmount":100,"assessedFeesAmount":0,"lines":[{"id":"line-1","inventoryItemId":"dress-1","dressCodeSnapshot":"DR-001","dressNameSnapshot":"Test dress","pickupDate":"2026-08-23","returnDate":"2026-08-25","rentalPrice":100,"securityDepositAmount":20,"bookingAdvanceAmount":0,"depositAmount":20,"deliveryStatus":"pending_delivery","lateFee":0,"damageFee":0}]}]}}'::jsonb
);
select revision from public.apply_showroom_command(
  3, 'payment.record', 'fixture-payment-record-001',
  '{"upserts":{"payments":[{"id":"payment-1","paymentNumber":"PAY-1","reservationNumber":"RSV-1","customerName":"Test customer","dressCode":"DR-001","dressName":"Test dress","paymentDate":"2026-08-22","type":"rental_payment","method":"cash","direction":"income","amount":100,"reservationTotal":120,"source":"manual","idempotencyKey":"fixture-payment-record-001"}],"reservations":[{"id":"reservation-1","reservationNumber":"RSV-1","customerId":"customer-1","inventoryItemId":"dress-1","customerName":"Test customer","customerPhone":"90000000","customerNameSnapshot":"Test customer","customerPhoneSnapshot":"90000000","dressCode":"DR-001","dressName":"Test dress","dressCodeSnapshot":"DR-001","dressNameSnapshot":"Test dress","pickupDate":"2026-08-23","returnDate":"2026-08-25","status":"confirmed","rentalPrice":100,"securityDepositAmount":20,"bookingAdvanceAmount":0,"bookingAdvanceCollectedAmount":0,"rentalCollectedAmount":100,"securityDepositCollectedAmount":0,"securityDepositRefundedAmount":0,"securityDepositRetainedAmount":0,"rentalRefundedAmount":0,"totalAmount":120,"paidAmount":100,"remainingAmount":0,"assessedFeesAmount":0,"lines":[{"id":"line-1","inventoryItemId":"dress-1","dressCodeSnapshot":"DR-001","dressNameSnapshot":"Test dress","pickupDate":"2026-08-23","returnDate":"2026-08-25","rentalPrice":100,"securityDepositAmount":20,"bookingAdvanceAmount":0,"depositAmount":20,"deliveryStatus":"pending_delivery","lateFee":0,"damageFee":0}]}]}}'::jsonb
);
commit;

do $$
declare
  revision_value bigint;
  tampered_reservation jsonb;
  forged_payment jsonb;
begin
  -- Direct access to the legacy full-state writer is no longer possible.
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  execute 'set local role authenticated';
  begin
    perform 1 from public.apply_showroom_snapshot(4, '{}'::jsonb, 'fixture-legacy-write', 'reservation.updateLine');
    raise exception 'TEST: legacy full snapshot RPC remained callable';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  select revision into revision_value from public.showroom_state where id = 'main';
  select jsonb_set(snapshot #> '{collections,reservations,0}', '{rentalPrice}', '999'::jsonb)
  into tampered_reservation
  from public.showroom_state where id = 'main';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'reservation.updateLine',
      'fixture-tamper-reservation-001',
      jsonb_build_object('upserts', jsonb_build_object('reservations', jsonb_build_array(tampered_reservation)))
    );
    raise exception 'TEST: staff rewrote reservation value after payment';
  exception when others then
    if position('LENA_POSTED_RESERVATION_VALUE_IMMUTABLE' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'reservation.updateLine',
      'fixture-tamper-delivery-001',
      jsonb_build_object(
        'upserts',
        jsonb_build_object(
          'reservations',
          jsonb_build_array(
            jsonb_set(
              (select snapshot #> '{collections,reservations,0}' from public.showroom_state where id = 'main'),
              '{status}',
              '"delivered"'::jsonb
            )
          )
        )
      )
    );
    raise exception 'TEST: staff bypassed the delivery workflow';
  exception when others then
    if position('LENA_DELIVERY_COMMAND_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- Before the review fix, an attacker could choose the delivery command name,
  -- flip reservation/item states, and omit the required handover evidence.
  -- The server now requires the linked delivery-return record itself.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'delivery.complete',
      'fixture-missing-delivery-evidence-001',
      jsonb_build_object(
        'upserts',
        jsonb_build_object(
          'reservations', jsonb_build_array(
            jsonb_set(
              jsonb_set((select snapshot #> '{collections,reservations,0}' from public.showroom_state where id = 'main'), '{status}', '"delivered"'::jsonb),
              '{lines,0,deliveryStatus}', '"delivered"'::jsonb
            )
          ),
          'dresses', jsonb_build_array(
            jsonb_set(
              jsonb_set((select snapshot #> '{collections,dresses,0}' from public.showroom_state where id = 'main'), '{status}', '"rented"'::jsonb),
              '{timesRented}', '1'::jsonb
            )
          )
        )
      )
    );
    raise exception 'TEST: staff completed delivery without evidence';
  exception when others then
    if position('LENA_DELIVERY_EVIDENCE_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- Audit history is server-owned: a client cannot invent an entry or omit the
  -- server-generated actor-bound record that accompanies an accepted command.
  if not exists (
    select 1
    from jsonb_array_elements((select snapshot #> '{collections,audit-log}' from public.showroom_state where id = 'main')) audit_entry
    where audit_entry ->> 'performedBy' = 'Staff operator'
      and audit_entry -> 'nextValues' ->> 'actorId' = '10000000-0000-4000-8000-000000000003'
  ) then
    raise exception 'TEST: accepted staff command lacks server audit attribution';
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'backup.export',
      'fixture-forged-audit-001',
      '{"upserts":{"audit-log":[{"id":"forged-audit","summary":"forged"}]}}'::jsonb
    );
    raise exception 'TEST: staff forged audit history';
  exception when others then
    if position('LENA_SERVER_AUDIT_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- A direct staff call cannot create a second overlapping booking for the
  -- same inventory item, even when it supplies an otherwise valid record.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'reservation.create',
      'fixture-tamper-overlap-001',
      '{"upserts":{"reservations":[{"id":"reservation-overlap","reservationNumber":"RSV-OVERLAP","customerId":"customer-1","inventoryItemId":"dress-1","customerName":"Test customer","customerPhone":"90000000","customerNameSnapshot":"Test customer","customerPhoneSnapshot":"90000000","dressCode":"DR-001","dressName":"Test dress","dressCodeSnapshot":"DR-001","dressNameSnapshot":"Test dress","pickupDate":"2026-08-24","returnDate":"2026-08-26","status":"confirmed","rentalPrice":100,"securityDepositAmount":20,"bookingAdvanceAmount":0,"bookingAdvanceCollectedAmount":0,"rentalCollectedAmount":0,"securityDepositCollectedAmount":0,"securityDepositRefundedAmount":0,"securityDepositRetainedAmount":0,"rentalRefundedAmount":0,"totalAmount":120,"paidAmount":0,"remainingAmount":100,"assessedFeesAmount":0}]}}'::jsonb
    );
    raise exception 'TEST: staff created an overlapping reservation';
  exception when others then
    if position('LENA_RESERVATION_OVERLAP' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'inventory.create',
      'fixture-tamper-inventory-001',
      jsonb_build_object(
        'upserts',
        jsonb_build_object(
          'dresses',
          jsonb_build_array(
            jsonb_set(
              (select snapshot #> '{collections,dresses,0}' from public.showroom_state where id = 'main'),
              '{rentalPrice}',
              '1'::jsonb
            )
          )
        )
      )
    );
    raise exception 'TEST: staff rewrote an existing inventory price';
  exception when others then
    if position('LENA_INVENTORY_FIELD_FORBIDDEN' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- Likewise, a sale command cannot mark stock sold unless a matching invoice
  -- and sales-line evidence travel in the same command patch.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'sale.create-invoice',
      'fixture-missing-sale-evidence-001',
      jsonb_build_object(
        'upserts',
        jsonb_build_object(
          'dresses', jsonb_build_array(
            jsonb_set((select snapshot #> '{collections,dresses,0}' from public.showroom_state where id = 'main'), '{status}', '"sold"'::jsonb)
          )
        )
      )
    );
    raise exception 'TEST: staff marked stock sold without invoice evidence';
  exception when others then
    if position('LENA_SALE_EVIDENCE_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  select jsonb_build_object(
    'id', 'payment-forged', 'paymentNumber', 'PAY-FORGED', 'reservationNumber', 'RSV-1',
    'customerName', 'Test customer', 'dressCode', 'DR-001', 'dressName', 'Test dress',
    'paymentDate', '2026-08-22', 'type', 'rental_payment', 'method', 'cash',
    'direction', 'income', 'amount', 500, 'reservationTotal', 120, 'source', 'manual',
    'idempotencyKey', 'fixture-payment-forged'
  ) into forged_payment;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'payment.record',
      'fixture-tamper-payment-001',
      jsonb_build_object('upserts', jsonb_build_object('payments', jsonb_build_array(forged_payment)))
    );
    raise exception 'TEST: staff appended an unreconciled forged movement';
  exception when others then
    if position('LENA_RESERVATION_LEDGER_MISMATCH' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- Unknown financial movement types cannot use a permitted command name as a
  -- generic JSON escape hatch.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'payment.record',
      'fixture-unknown-payment-type-001',
      jsonb_build_object(
        'upserts',
        jsonb_build_object('payments', jsonb_build_array(jsonb_set(forged_payment, '{type}', '"not-a-payment-type"'::jsonb)))
      )
    );
    raise exception 'TEST: unknown payment type was accepted';
  exception when others then
    if position('LENA_PAYMENT_TYPE_INVALID' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'preferences.save',
      'fixture-staff-admin-write-001',
      '{"replacements":{"preferences":[]}}'::jsonb
    );
    raise exception 'TEST: staff changed admin configuration';
  exception when others then
    if position('LENA_ADMIN_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- A close record cannot be injected without its cash-reconciliation shape.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.apply_showroom_command(
      revision_value,
      'daily-close.close',
      'fixture-invalid-daily-close-001',
      jsonb_build_object('upserts', jsonb_build_object('daily-closings', jsonb_build_array(
        jsonb_build_object('id', 'close-1', 'businessDate', current_date::text, 'status', 'closed')
      )))
    );
    raise exception 'TEST: invalid daily close was accepted';
  exception when others then
    if position('LENA_DAILY_CLOSE_INVALID' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- Explicit recovery RPCs are admin-only and cannot become a staff bulk-write
  -- bypass merely because they intentionally handle complete backup/reset data.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  begin
    perform 1 from public.reset_showroom_state(revision_value, 'fixture-staff-reset-001');
    raise exception 'TEST: staff invoked authoritative reset';
  exception when others then
    if position('LENA_ADMIN_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    perform 1 from public.restore_showroom_backup(revision_value, 'fixture-staff-restore-001', '{"applicationId":"dress-roomshow","collections":{}}'::jsonb);
    raise exception 'TEST: staff invoked authoritative restore';
  exception when others then
    if position('LENA_ADMIN_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
  execute 'reset role';

  -- A complete, evidenced delivery still succeeds through the constrained
  -- command path; the witness rules prevent shortcuts, not the real workflow.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', false);
  select revision into revision_value
  from public.apply_showroom_command(
    revision_value,
    'delivery.complete',
    'fixture-valid-delivery-001',
    jsonb_build_object(
      'upserts',
      jsonb_build_object(
        'reservations', jsonb_build_array(
          jsonb_set(
            jsonb_set(
              jsonb_set((select snapshot #> '{collections,reservations,0}' from public.showroom_state where id = 'main'), '{status}', '"delivered"'::jsonb),
              '{lines,0,deliveryStatus}', '"delivered"'::jsonb
            ),
            '{lines,0,deliveryDateTime}', to_jsonb(now()::text)
          )
        ),
        'dresses', jsonb_build_array(
          jsonb_set(
            jsonb_set((select snapshot #> '{collections,dresses,0}' from public.showroom_state where id = 'main'), '{status}', '"rented"'::jsonb),
            '{timesRented}', '1'::jsonb
          )
        ),
        'delivery-return', jsonb_build_array(
          jsonb_build_object(
            'id', 'delivery-1', 'reservationNumber', 'RSV-1',
            'customerId', 'customer-1', 'inventoryItemId', 'dress-1',
            'customerName', 'Test customer', 'customerPhone', '90000000',
            'dressCode', 'DR-001', 'dressName', 'Test dress',
            'status', 'delivered', 'deliveryDateTime', now()::text,
            'depositAmount', 20, 'lateFee', 0, 'damageFee', 0, 'depositRefundAmount', 0
          )
        )
      )
    )
  );
  if revision_value <> 5 then
    raise exception 'TEST: valid delivery did not advance the authoritative revision';
  end if;

  -- A canonical invoice sale also remains valid when it carries all linked
  -- invoice, sale-line, and inventory-state evidence.
  select revision into revision_value
  from public.apply_showroom_command(
    revision_value,
    'inventory.create',
    'fixture-valid-sale-inventory-001',
    jsonb_build_object('upserts', jsonb_build_object('dresses', jsonb_build_array(
      jsonb_build_object(
        'id', 'dress-sale', 'code', 'DR-SALE', 'barcode', 'BC-SALE',
        'name', 'Sale dress', 'status', 'available', 'rentalPrice', 0,
        'salePrice', 50, 'defaultSecurityDepositAmount', 0,
        'isForRent', false, 'isForSale', true, 'images', array[]::text[]
      )
    )))
  );
  select revision into revision_value
  from public.apply_showroom_command(
    revision_value,
    'sale.create-invoice',
    'fixture-valid-sale-001',
    jsonb_build_object(
      'upserts',
      jsonb_build_object(
        'sales-invoices', jsonb_build_array(
          jsonb_build_object(
            'id', 'invoice-1', 'invoiceNumber', 'INV-1', 'saleDate', current_date::text,
            'customerName', 'Sale customer', 'paymentMethod', 'cash', 'totalAmount', 50,
            'lines', jsonb_build_array(jsonb_build_object(
              'id', 'invoice-line-1', 'dressCode', 'DR-SALE', 'dressName', 'Sale dress',
              'amount', 50, 'listPrice', 50
            ))
          )
        ),
        'sales', jsonb_build_array(
          jsonb_build_object(
            'id', 'sale-1', 'saleNumber', 'SAL-1', 'invoiceNumber', 'INV-1',
            'saleDate', current_date::text, 'dressCode', 'DR-SALE', 'dressName', 'Sale dress',
            'customerName', 'Sale customer', 'amount', 50, 'listPrice', 50, 'paymentMethod', 'cash'
          )
        ),
        'dresses', jsonb_build_array(
          jsonb_set(
            (select value from jsonb_array_elements((select snapshot #> '{collections,dresses}' from public.showroom_state where id = 'main')) where value ->> 'id' = 'dress-sale'),
            '{status}', '"sold"'::jsonb
          )
        )
      )
    )
  );
  if revision_value <> 7 then
    raise exception 'TEST: valid invoice sale did not advance the authoritative revision';
  end if;
  execute 'reset role';
end;
$$;

-- Legacy compatibility tables are no longer a browser-writable alternate
-- authority surface, even for an active staff account.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
do $$
begin
  begin
    update public.dresses set name = 'forged legacy row';
    raise exception 'TEST: staff mutated legacy normalized table';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
rollback;

-- A staff profile cannot self-promote through the direct table API.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
do $$
begin
  begin
    update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000003';
    raise exception 'TEST: staff self-promoted to admin';
  exception when raise_exception then
    if position('only an active admin can change account privileges' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;
rollback;

-- Even an administrator has no generic full-snapshot escape hatch; authority is
-- exercised through named commands with the same server invariants.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    perform 1 from public.apply_showroom_snapshot(4, '{}'::jsonb, 'fixture-admin-legacy-write', 'database.import');
    raise exception 'TEST: admin retained generic snapshot write';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
rollback;

-- Existing legitimate admin remains functional for an explicit settings command.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select revision from public.apply_showroom_command(
  (select revision from public.showroom_state where id = 'main'),
  'preferences.save',
  'fixture-admin-preferences-001',
  '{"replacements":{"preferences":[]}}'::jsonb
);
commit;

-- The final active admin cannot be removed through the data API.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    update public.profiles set is_active = false where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'TEST: final active admin was disabled';
  exception when check_violation then
    if position('LENA_LAST_ACTIVE_ADMIN_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;
rollback;

-- P1/A-05: the repaired migration creates the relation and its public
-- projection omits non-allowlisted keys even when the source object contains them.
update public.showroom_state
set snapshot = jsonb_set(
  snapshot,
  '{collections,showroom-profile}',
  '[{"brandName":"Public LENA","internalSecret":"must-not-leak","categories":[{"name":"Evening","description":"Public","internalCategoryToken":"must-not-leak"}],"services":[{"title":"Rental","description":"Public","internalServiceToken":"must-not-leak"}],"faq":[{"question":"Q","answer":"A","internalFaqToken":"must-not-leak"}],"contact":{"phone":"90000000","workingHours":"10-20","alternatePhones":["90000001",{"internalPhoneToken":"must-not-leak"}],"internalToken":"must-not-leak"}}]'::jsonb
)
where id = 'main';

do $$
declare
  public_profile jsonb;
begin
  if to_regclass('public.showroom_public_profile') is null then
    raise exception 'TEST: public showroom profile relation missing';
  end if;
  select profile into public_profile from public.showroom_public_profile where id = 'main';
  if public_profile ? 'internalSecret'
     or (public_profile -> 'contact') ? 'internalToken'
     or (public_profile -> 'categories' -> 0) ? 'internalCategoryToken'
     or (public_profile -> 'services' -> 0) ? 'internalServiceToken'
     or (public_profile -> 'faq' -> 0) ? 'internalFaqToken'
     or jsonb_array_length(public_profile -> 'contact' -> 'alternatePhones') <> 1
     or public_profile ->> 'brandName' <> 'Public LENA' then
    raise exception 'TEST: public profile projection is not allowlisted';
  end if;
end;
$$;

begin;
set local role anon;
select count(*) as anonymous_public_profile_rows from public.showroom_public_profile where id = 'main';
rollback;
