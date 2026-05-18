create or replace function prevent_overlapping_reservations()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from reservations r
    where r.dress_id = new.dress_id
      and r.id <> new.id
      and r.status in ('pending', 'confirmed', 'delivered', 'overdue')
      and new.status in ('pending', 'confirmed', 'delivered', 'overdue')
      and r.pickup_date <= new.return_date
      and new.pickup_date <= r.return_date
  ) then
    raise exception 'reservation overlap';
  end if;

  return new;
end;
$$;

create trigger reservations_prevent_overlap
before insert or update on reservations
for each row execute function prevent_overlapping_reservations();
