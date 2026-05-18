create or replace function refresh_reservation_payment_totals()
returns trigger
language plpgsql
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.reservation_id, old.reservation_id);

  update reservations
  set paid_amount = coalesce((select sum(amount) from payments where reservation_id = target_id), 0),
      remaining_amount = greatest(total_amount - coalesce((select sum(amount) from payments where reservation_id = target_id), 0), 0),
      updated_at = now()
  where id = target_id;

  return null;
end;
$$;

create trigger payments_refresh_totals
after insert or update or delete on payments
for each row execute function refresh_reservation_payment_totals();
