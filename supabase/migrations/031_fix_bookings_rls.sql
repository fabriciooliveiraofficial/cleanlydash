-- Migration 031: Fix RLS for Bookings and Calendars
-- Resolves the issue where Cleaners see 0 tasks due to non-existent 'profiles' table reference.

-- 1. Redefine 'public.bookings' Select Policy
DROP POLICY IF EXISTS "Users can view their tenant's bookings" ON public.bookings;
CREATE POLICY "Users can view their tenant's bookings"
ON public.bookings FOR SELECT
USING (
    -- Access via Tenant ID from team_members
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR 
    -- Access if manually assigned (Even if not in team_members yet)
    assigned_to = auth.uid()
    OR
    -- Access if owner
    tenant_id = auth.uid()
);

-- 2. Redefine 'public.calendars' Select Policy
DROP POLICY IF EXISTS "Users can view their tenant's calendars" ON public.calendars;
CREATE POLICY "Users can view their tenant's calendars"
ON public.calendars FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR tenant_id = auth.uid()
);

-- 3. Ensure other policies don't use the 'profiles' table (Cleanup)
DROP POLICY IF EXISTS "Users can insert bookings for their tenant" ON public.bookings;
CREATE POLICY "Users can insert bookings for their tenant"
  ON public.bookings for insert
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their tenant's bookings" ON public.bookings;
CREATE POLICY "Users can update their tenant's bookings"
  ON public.bookings FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid())
    OR tenant_id = auth.uid()
  );

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
