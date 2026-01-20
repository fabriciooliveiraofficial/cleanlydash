-- Migration 035: Ensure role_id and refresh schema cache
-- This ensures the team_members table has the role_id column and refreshes PostgREST cache

-- 1. Ensure role_id column exists (it should, but just in case)
ALTER TABLE IF EXISTS public.team_members
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.custom_roles(id);

-- 2. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 3. Also ensure pay_rate exists since it's used in the payout feature
ALTER TABLE IF EXISTS public.team_members
ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(10,2) DEFAULT 0;
