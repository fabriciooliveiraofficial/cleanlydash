-- Add 'cleaner' to app_role enum if it doesn't exist
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cleaner';

-- Ensure user_roles table exists (just in case)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role app_role NOT NULL DEFAULT 'property_owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy to allow Super Admins AND Property Owners to view all roles (for Team page)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Users can read own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (
    auth.uid() = user_id -- Can see self
    OR 
    EXISTS ( -- Or is an admin/owner viewing others
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'property_owner')
    )
  );

-- Policy to allow Admins/Owners to INSERT/UPDATE roles (Start Team)
CREATE POLICY "Admins can manage roles" 
  ON public.user_roles 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'property_owner')
    )
  );
