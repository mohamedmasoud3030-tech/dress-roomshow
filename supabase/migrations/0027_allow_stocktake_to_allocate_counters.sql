-- Let a stocktake session allocate its own sequence number.
--
-- `stocktake.start` writes the new session into `stocktake-sessions` and bumps
-- the `stocktake-session` row in `counters` to produce its human number
-- (STK-001). The authoritative collection map allowed only
-- `stocktake-sessions`, so starting a stocktake was rejected with
-- LENA_COMMAND_COLLECTION_FORBIDDEN (42501) and the stocktake screen could not
-- be used at all.
--
-- Every other command that allocates a numbered document (inventory.create,
-- accessory.create, design.create) is already allowed `counters`; the stocktake
-- trio simply missed out. This restates private.lena_command_collections
-- verbatim with `counters` added to the stocktake commands.

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
