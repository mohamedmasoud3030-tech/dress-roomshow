-- Authorise `inventory.update` end to end.
--
-- The owner can now edit a piece she already owns — including its own discount
-- percentage. The transition guard (0030) already knew the command, and the
-- client already sends it, but the two allowlists that decide whether a command
-- name exists at all still did not: private.lena_known_command rejected it with
-- LENA_UNKNOWN_COMMAND (22023) before any work happened. The edit saved on the
-- device and then failed to reach the cloud, so the landing page kept the old
-- price while the app showed the new one.
--
-- `inventory.update` touches one collection: `dresses`. It allocates no
-- sequence numbers, so it needs no `counters` and no `retired-codes`.
-- Both functions are restated verbatim with the new entry.

create or replace function private.lena_known_command(command_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select command_name = any (array[
    'inventory.create', 'inventory.update', 'inventory.archive', 'inventory.delete', 'inventory.images',
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
    when 'inventory.update' then return array['dresses'];
    when 'customer.create', 'customer.update', 'customer.archive', 'customer.delete'
      then return array['customers'];
    when 'customer.conduct.add', 'customer.conduct.remove'
      then return array['customer-conduct-notes'];
    when 'waitlist.create', 'waitlist.notify', 'waitlist.close', 'waitlist.convert'
      then return array['waitlist'];
    when 'stocktake.start', 'stocktake.complete', 'stocktake.cancel'
      then return array['stocktake-sessions', 'counters'];
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
