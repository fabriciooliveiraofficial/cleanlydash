-- 1. Deduplicate team_availability (Keep the latest entry)
DELETE FROM public.team_availability a
USING public.team_availability b
WHERE a.id < b.id 
AND a.member_id = b.member_id 
AND a.day_of_week = b.day_of_week;

-- 2. Add Unique Constraint to prevent future duplicates
ALTER TABLE public.team_availability 
ADD CONSTRAINT team_availability_member_day_unique UNIQUE (member_id, day_of_week);

-- 3. Ensure Team Members are visible to Tenant Owners (Crucial for RLS subqueries)
-- If team_members has RLS, the owner needs to be able to SELECT the member row to verify tenant_id.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'team_members' 
        AND policyname = 'Tenant owners can view their members'
    ) THEN
        CREATE POLICY "Tenant owners can view their members" ON public.team_members
        FOR SELECT USING (
            tenant_id = auth.uid()
        );
    END IF;
END $$;
