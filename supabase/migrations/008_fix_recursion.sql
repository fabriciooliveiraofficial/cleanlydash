-- FIX: 500 Error caused by Infinite Recursion in RLS
-- We use a SECURITY DEFINER function to check admin status without triggering RLS recursively.

CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'property_owner')
  );
END;
$$;

-- Updates Policies to use the safe function
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Users can read own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    current_user_is_admin_or_owner() -- Safe check
  );

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" 
  ON public.user_roles 
  FOR ALL 
  USING (
    current_user_is_admin_or_owner() -- Safe check
  );
