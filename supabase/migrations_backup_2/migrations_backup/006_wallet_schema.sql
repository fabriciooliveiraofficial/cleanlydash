
-- Create Wallet Ledger table
create table if not exists public.wallet_ledger (
    id uuid not null default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id),
    amount numeric(10, 2) not null,
    description text null,
    created_at timestamp with time zone not null default now(),
    constraint wallet_ledger_pkey primary key (id)
);

-- RLS Policies
alter table public.wallet_ledger enable row level security;

create policy "Users can view their tenant's ledger"
on public.wallet_ledger for select
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert into their tenant's ledger"
on public.wallet_ledger for insert
to authenticated
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));
