-- Trust Layer: Inventory & Evidence Schema

-- 1. Tables for Inventory (Enxoval/Supplies)
create table if not exists public.inventory_items (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id),
  customer_id uuid references public.customers(id) on delete cascade, -- Linked to a property
  name text not null,
  category text, -- 'linen', 'toiletries', 'kitchen'
  ideal_quantity integer default 0,
  min_quantity integer default 0,
  created_at timestamptz default now()
);

-- 2. Tables for Evidence (Photos/Damages linked to a Booking/Turnover)
create table if not exists public.job_evidence (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id),
  booking_id uuid references public.bookings(id) on delete cascade,
  type text not null, -- 'arrival_photo', 'departure_photo', 'damage_report', 'inventory_check'
  url text, -- Photo URL
  notes text,
  metadata jsonb, -- For coords, timestamp details
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 3. Inventory Checks (Logs during a turnover)
create table if not exists public.inventory_logs (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id),
  booking_id uuid references public.bookings(id) on delete cascade,
  item_id uuid references public.inventory_items(id) on delete cascade,
  quantity_found integer,
  restocked_amount integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- 4. Security (RLS)
alter table public.inventory_items enable row level security;
alter table public.job_evidence enable row level security;
alter table public.inventory_logs enable row level security;

create policy "Enable all for users" on public.inventory_items for all using (true);
create policy "Enable all for users" on public.job_evidence for all using (true);
create policy "Enable all for users" on public.inventory_logs for all using (true);
