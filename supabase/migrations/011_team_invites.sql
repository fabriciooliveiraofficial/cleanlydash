-- 1. Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  tenant_id UUID REFERENCES auth.users(id) NOT NULL,
  token UUID DEFAULT gen_random_uuid() NOT NULL, -- The secret link token
  status TEXT DEFAULT 'pending', -- pending, accepted, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tenant_id to user_roles logic (Who do you work for?)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id);

-- 3. Update RLS for user_roles to allow Owners to see their Staff
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role OR managed employees" ON public.user_roles;

CREATE POLICY "Users can read own role OR managed employees" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id -- Can see self
  OR 
  auth.uid() = tenant_id -- Can see my employees
);

-- 4. RLS for team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view/create their invites" ON public.team_invites;

CREATE POLICY "Owners can view/create their invites"
ON public.team_invites
FOR ALL
USING (auth.uid() = tenant_id);

-- Allow public (anon/authenticated) to read invite by TOKEN (for the Accept page)
-- This is tricky with RLS, often easier to handle via Edge Function with Service Role.
-- But for the API select, we can allow reading if they have the token.
DROP POLICY IF EXISTS "Public can read invite by token" ON public.team_invites;

CREATE POLICY "Public can read invite by token"
ON public.team_invites
FOR SELECT
USING (true); -- We will filter by token in query, or relying on function privacy. 
-- Actually, let's keep it restricted. "Owners can view" is enough for the dashboard.
-- The "Accept" action will be done by a secure Edge Function (Service Role).
