
-- Create Calendars Table (Stores iCal URLs)
create table if not exists public.calendars (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id),
  customer_id uuid references public.customers(id) on delete cascade, -- Link to Property/Owner
  name text not null, -- e.g. "Airbnb", "Booking.com"
  url text not null,
  last_synced_at timestamptz,
  color text default 'rose', -- UI Color
  created_at timestamptz default now()
);

-- Create Bookings Table (Stores Events)
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id),
  customer_id uuid references public.customers(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete cascade,
  
  uid text, -- iCal UID to prevent duplicates
  summary text, -- Event Title / Guest Name
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  
  status text default 'confirmed', -- confirmed, tentative, cancelled
  platform text, -- Airbnb, VRBO (derived from calendar)
  price decimal, -- Estimated or parsed
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.calendars enable row level security;
alter table public.bookings enable row level security;

-- Policies for Calendars
create policy "Users can view their tenant's calendars"
  on public.calendars for select
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert calendars for their tenant"
  on public.calendars for insert
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can update their tenant's calendars"
  on public.calendars for update
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can delete their tenant's calendars"
  on public.calendars for delete
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- Policies for Bookings
create policy "Users can view their tenant's bookings"
  on public.bookings for select
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert bookings for their tenant"
  on public.bookings for insert
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can update their tenant's bookings"
  on public.bookings for update
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can delete their tenant's bookings"
  on public.bookings for delete
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- Auto-update updated_at for bookings
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_bookings_updated_at
  before update on public.bookings
  for each row
  execute procedure public.handle_updated_at();
