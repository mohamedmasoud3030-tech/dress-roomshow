-- Dress roomshow initial schema

create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'staff');
create type dress_status as enum ('available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive');
create type customer_status as enum ('normal', 'trusted', 'warning', 'blocked');
create type reservation_status as enum ('pending', 'confirmed', 'delivered', 'returned', 'cancelled', 'overdue');
create type payment_type as enum ('rental', 'deposit', 'penalty', 'refund', 'adjustment');
create type payment_method as enum ('cash', 'card', 'bank_transfer', 'other');
create type expense_category as enum ('laundry', 'tailoring', 'maintenance', 'purchase', 'rent', 'salary', 'other');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dresses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category text,
  color text,
  size text,
  purchase_price numeric(12, 3) not null default 0,
  rental_price numeric(12, 3) not null default 0,
  sale_price numeric(12, 3) not null default 0,
  deposit_amount numeric(12, 3) not null default 0,
  status dress_status not null default 'available',
  is_for_rent boolean not null default true,
  is_for_sale boolean not null default false,
  main_image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dress_images (
  id uuid primary key default gen_random_uuid(),
  dress_id uuid not null references dresses(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text,
  measurements text,
  notes text,
  status customer_status not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_phone_unique_idx on customers (phone);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  dress_id uuid not null references dresses(id) on delete restrict,
  reservation_date date not null default current_date,
  pickup_date date not null,
  return_date date not null,
  status reservation_status not null default 'pending',
  rental_price numeric(12, 3) not null default 0,
  deposit_amount numeric(12, 3) not null default 0,
  total_amount numeric(12, 3) not null default 0,
  paid_amount numeric(12, 3) not null default 0,
  remaining_amount numeric(12, 3) not null default 0,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_valid_dates check (return_date >= pickup_date),
  constraint reservations_amounts_non_negative check (rental_price >= 0 and deposit_amount >= 0 and total_amount >= 0 and paid_amount >= 0 and remaining_amount >= 0)
);

create index reservations_customer_id_idx on reservations (customer_id);
create index reservations_dress_id_idx on reservations (dress_id);
create index reservations_dates_idx on reservations (pickup_date, return_date);

create table payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  amount numeric(12, 3) not null,
  payment_type payment_type not null,
  payment_method payment_method not null default 'cash',
  payment_date date not null default current_date,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payments_amount_non_zero check (amount <> 0)
);

create index payments_reservation_id_idx on payments (reservation_id);
create index payments_customer_id_idx on payments (customer_id);
create index payments_payment_date_idx on payments (payment_date);

create table delivery_returns (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id) on delete restrict,
  delivered_at timestamptz,
  delivered_condition text,
  returned_at timestamptz,
  returned_condition text,
  late_fee numeric(12, 3) not null default 0,
  damage_fee numeric(12, 3) not null default 0,
  deposit_refund_amount numeric(12, 3) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12, 3) not null,
  category expense_category not null default 'other',
  expense_date date not null default current_date,
  related_dress_id uuid references dresses(id) on delete set null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount > 0)
);

create index expenses_date_idx on expenses (expense_date);
create index expenses_related_dress_id_idx on expenses (related_dress_id);

create or replace function prevent_overlapping_reservations()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('pending', 'confirmed', 'delivered', 'overdue') then
    if exists (
      select 1
      from reservations r
      where r.dress_id = new.dress_id
        and r.id <> new.id
        and r.status in ('pending', 'confirmed', 'delivered', 'overdue')
        and daterange(r.pickup_date, r.return_date, '[]') && daterange(new.pickup_date, new.return_date, '[]')
    ) then
      raise exception 'Dress is not available for the selected date range';
    end if;
  end if;

  return new;
end;
$$;

create trigger reservations_prevent_overlap
before insert or update on reservations
for each row execute function prevent_overlapping_reservations();

create or replace function refresh_reservation_payment_totals()
returns trigger
language plpgsql
as $$
declare
  target_reservation_id uuid;
begin
  target_reservation_id := coalesce(new.reservation_id, old.reservation_id);

  update reservations
  set paid_amount = coalesce((select sum(amount) from payments where reservation_id = target_reservation_id), 0),
      remaining_amount = greatest(total_amount - coalesce((select sum(amount) from payments where reservation_id = target_reservation_id), 0), 0),
      updated_at = now()
  where id = target_reservation_id;

  return null;
end;
$$;

create trigger payments_refresh_reservation_totals
後 insert or update or delete on payments
for each row execute function refresh_reservation_payment_totals();
