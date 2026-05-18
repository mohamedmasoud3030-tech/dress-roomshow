create table expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(12, 3) not null,
  category text not null default 'other',
  expense_date date not null default current_date,
  related_dress_id uuid references dresses(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
