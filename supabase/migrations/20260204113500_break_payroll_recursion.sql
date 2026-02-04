-- 1. Break infinite recursion in payroll_entries
-- Use team_members table directly for tenant check instead of jumping to payroll_periods
DROP POLICY IF EXISTS "Tenant manages payroll_entries" ON public.payroll_entries;
CREATE POLICY "Tenant manages payroll_entries" ON public.payroll_entries
FOR ALL USING (
  member_id IN (
    SELECT id FROM public.team_members 
    WHERE tenant_id = auth.uid()
  )
);

-- 2. Ensure payroll_periods Staff policy doesn't recurse back through a complex path
-- Use a simple check: staff can see periods where there is an entry for them
DROP POLICY IF EXISTS "Staff sees relevant payroll_periods" ON public.payroll_periods;
CREATE POLICY "Staff sees relevant payroll_periods" ON public.payroll_periods
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.payroll_entries 
    JOIN public.team_members ON team_members.id = payroll_entries.member_id 
    WHERE payroll_entries.period_id = payroll_periods.id 
    AND team_members.user_id = auth.uid()
  )
);

-- 3. Cleanup existing loops
DROP POLICY IF EXISTS "Tenant manages payroll_periods" ON public.payroll_periods;
CREATE POLICY "Tenant manages payroll_periods" ON public.payroll_periods
FOR ALL USING (tenant_id = auth.uid());
