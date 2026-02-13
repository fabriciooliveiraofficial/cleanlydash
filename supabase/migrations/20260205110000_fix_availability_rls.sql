-- Ensure RLS is enabled
ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;

-- Policy for Tenant Owners (Admins)
-- They can do EVERYTHING on availability slots for members that belong to their tenant
-- Policy for Tenant Owners (Admins)
-- They can do EVERYTHING on availability slots for members that belong to their tenant
DROP POLICY IF EXISTS "Tenant owners can manage team availability" ON public.team_availability;
CREATE POLICY "Tenant owners can manage team availability" ON public.team_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = team_availability.member_id
    AND tm.tenant_id = auth.uid()
  )
);

-- Policy for Team Members (Cleaners)
-- They can manage their OWN availability
DROP POLICY IF EXISTS "Members can manage their own availability" ON public.team_availability;
CREATE POLICY "Members can manage their own availability" ON public.team_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = team_availability.member_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy for viewing (Read Access)
-- Tenant owners can view all their team
-- Members can view themselves
-- (Technically covered by above ALL policies, but good to be explicit if ALL is restrictive?)
-- Postgres ALL covers SELECT, INSERT, UPDATE, DELETE.
-- We might want a separate READ policy if we want *other* members to see *other* members' availability (e.g. for scheduling conflicts)?
-- For now, let's stick to the owner/self model.

-- Fix for potentially missing policy on INSERT (Postgres checks WITH CHECK for inserts)
-- The USING clause in FOR ALL serves as both USING and WITH CHECK if WITH CHECK is not specified.
