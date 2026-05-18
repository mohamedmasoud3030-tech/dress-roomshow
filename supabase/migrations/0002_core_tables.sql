create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key,
  full_name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
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
  status text not null default 'available' check (status in ('available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive')),
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
  phone text not null unique,
  address text,
  measurements text,
  notes text,
  status text not null default 'normal' check (status in ('normal', 'trusted', 'warning', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  dress_id uuid not null references dresses(id) on delete restrict,
  reservation_date date not null default current_date,
  pickup_date date not null,
  return_date date not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'delivered', 'returned', 'cancelled', 'overdue')),
  rental_price numeric(12, 3) not null default 0,
  deposit_amount numeric(12, 3) not null default 0,
  total_amount numeric(12, 3) not null default 0,
  paid_amount numeric(12, 3) not null default 0,
  remaining_amount numeric(12, 3) not null default 0,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_valid_dates check (return_date >= pickup_date)
);

create index reservations_customer_id_idx on reservations (customer_id);
create index reservations_dress_id_idx on reservations (dress_id);
create index reservations_dates_idx on reservations (pickup_date, return_date);
