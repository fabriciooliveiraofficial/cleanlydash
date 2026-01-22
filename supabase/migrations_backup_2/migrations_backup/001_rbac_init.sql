-- 1. Create Enum for Roles
CREATE TYPE app_role AS ENUM ('super_admin', 'property_owner', 'staff', 'guest');

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role app_role NOT NULL DEFAULT 'property_owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Policy: Users can read their own role
CREATE POLICY "Users can read own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Super Admins can do everything with roles
-- Note: This requires a circular dependency check (chicken and egg)
-- For bootstrapping, we allow the service_role or specific seed users to manage this.
-- We will implement a secure function for admin checks later.

-- 5. Trigger to handle new users (Default Role)
CREATE OR REPLACE FUNCTION public.handle_new_user_role() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'property_owner'); -- Default to Property Owner for new signups (can be changed by Admin)
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow idempotency
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();

-- 6. Grant usage
GRANT USAGE ON TYPE app_role TO authenticated;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
