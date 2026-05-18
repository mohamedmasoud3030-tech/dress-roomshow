create table returns (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id),
  delivered_at timestamptz,
  returned_at timestamptz,
  delivered_condition text,
  returned_condition text,
  late_fee numeric(12, 3) not null default 0,
  damage_fee numeric(12, 3) not null default 0,
  deposit_refund_amount numeric(12, 3) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
