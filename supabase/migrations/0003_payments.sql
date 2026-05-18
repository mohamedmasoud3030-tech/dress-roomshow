create table payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id),
  customer_id uuid not null references customers(id),
  amount numeric(12, 3) not null,
  payment_type text not null,
  payment_method text not null default 'cash',
  payment_date date not null default current_date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
