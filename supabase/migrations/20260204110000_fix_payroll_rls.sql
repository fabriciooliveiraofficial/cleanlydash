-- Fix RLS for payroll_entries to allow staff members to see their own entries
DROP POLICY IF EXISTS "Staff sees own payroll_entries" ON public.payroll_entries;
CREATE POLICY "Staff sees own payroll_entries" ON public.payroll_entries
FOR SELECT USING (
  member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid())
);

-- Fix RLS for payroll_periods to allow staff members to see periods where they have entries
DROP POLICY IF EXISTS "Staff sees relevant payroll_periods" ON public.payroll_periods;
CREATE POLICY "Staff sees relevant payroll_periods" ON public.payroll_periods
FOR SELECT USING (
  id IN (SELECT period_id FROM public.payroll_entries WHERE member_id IN (SELECT id FROM public.team_members WHERE user_id = auth.uid()))
);
