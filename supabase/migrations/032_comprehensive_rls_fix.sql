-- Migration 032: Comprehensive RLS Overhaul
-- Fixes broken dependencies on 'public.profiles' and grants read access to Clerks/Staff/Cleaners.

-- 1. Fix 'public.customers' RLS
-- (Dropping policies if they exist to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their tenant's customers" ON public.customers;
DROP POLICY IF EXISTS "Owners can manage properties" ON public.customers;
DROP POLICY IF EXISTS "Tenant members can view customers" ON public.customers;

CREATE POLICY "Tenant members can view customers"
ON public.customers FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 2. Fix 'public.services' RLS
DROP POLICY IF EXISTS "Owners can manage own services" ON public.services;
CREATE POLICY "Tenant members can view services"
ON public.services FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 3. Fix 'public.tasks' RLS
DROP POLICY IF EXISTS "Owners can manage own tasks" ON public.tasks;
CREATE POLICY "Tenant members can view tasks"
ON public.tasks FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 4. Fix 'public.inventory_items' RLS
DROP POLICY IF EXISTS "Owners can manage own inventory_items" ON public.inventory_items;
CREATE POLICY "Tenant members can view inventory"
ON public.inventory_items FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 5. Fix Communications Schema (Removing profiles dependency)
DROP POLICY IF EXISTS "Users can view their tenant phone numbers" ON communications.phone_numbers;
CREATE POLICY "Tenant members can view phone numbers" 
ON communications.phone_numbers FOR SELECT 
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can view their tenant conversations" ON communications.conversations;
CREATE POLICY "Tenant members can view conversations" 
ON communications.conversations FOR SELECT 
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can view their tenant messages" ON communications.messages;
CREATE POLICY "Tenant members can view messages" 
ON communications.messages FOR SELECT 
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert messages for their tenant" ON communications.messages;
CREATE POLICY "Tenant members can insert messages" 
ON communications.messages FOR INSERT 
WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 6. Fix Wallet Ledger RLS
DROP POLICY IF EXISTS "Users can view their tenant's ledger" ON public.wallet_ledger;
CREATE POLICY "Tenant members can view ledger"
ON public.wallet_ledger FOR SELECT
USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
);

-- 7. Reload Schema Cache
NOTIFY pgrst, 'reload config';
