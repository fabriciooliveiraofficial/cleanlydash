-- FIX RLS POLICY FOR CUSTOMERS TABLE
-- The current policy likely enforces "tenant_id = auth.uid()", which is incorrect because
-- the Tenant ID is different from the User ID.
-- This script updates the policy to check if the user belongs to the tenant via the 'profiles' table.

-- 1. Drop existing restrictive policies (names may vary, dropping common potential names)
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can select customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;

-- 2. Create new correct policies

-- VIEW: Allow viewing customers if the user's profile is linked to the customer's tenant
CREATE POLICY "Tenant members can view customers" ON public.customers
FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- INSERT: Allow inserting customers if the user's profile is linked to the destination tenant
CREATE POLICY "Tenant members can insert customers" ON public.customers
FOR INSERT WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- UPDATE: Allow updating customers if the user's profile is linked to the customer's tenant
CREATE POLICY "Tenant members can update customers" ON public.customers
FOR UPDATE USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- DELETE: Allow deleting customers if the user's profile is linked to the customer's tenant
CREATE POLICY "Tenant members can delete customers" ON public.customers
FOR DELETE USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Verify
-- Cannot verify easily in SQL script without specific IDs, but the policy creation confirms syntax.
