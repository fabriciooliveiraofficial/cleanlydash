-- Migration 022: Update Team Invites for RBAC
-- Adds role_id to team_invites to support custom roles

-- 1. Add role_id column
ALTER TABLE public.team_invites
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.custom_roles(id);

-- 2. Make role nullable (since we prefer role_id now)
ALTER TABLE public.team_invites
ALTER COLUMN role DROP NOT NULL;

-- 3. RLS Updates (ensure idempotence)
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Allow Owners to manage their invites
DROP POLICY IF EXISTS "Owners can view/create their invites" ON public.team_invites;
CREATE POLICY "Owners can view/create their invites"
ON public.team_invites
FOR ALL
USING (auth.uid() = tenant_id);

-- Allow Public/Service Role to read by token (used by accept_invite function/page)
DROP POLICY IF EXISTS "Public can read invite by token" ON public.team_invites;
CREATE POLICY "Public can read invite by token"
ON public.team_invites
FOR SELECT
USING (true); -- Filtered by query in logic
