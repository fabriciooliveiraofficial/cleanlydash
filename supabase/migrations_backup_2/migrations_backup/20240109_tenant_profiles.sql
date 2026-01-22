-- Create tenant_profiles table for public branding
CREATE TABLE IF NOT EXISTS public.tenant_profiles (
  id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY, -- Tenant ID (Owner User ID)
  slug TEXT NOT NULL UNIQUE, -- URL identifier (e.g. 'acme-hotel')
  name TEXT NOT NULL,       -- Display Name
  logo_url TEXT,            -- Optional Logo URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view tenant profiles (for registration page)
CREATE POLICY "Public can view tenant profiles" 
ON public.tenant_profiles 
FOR SELECT 
USING (true);

-- Policy: Tenants can update their own profile
CREATE POLICY "Tenants can update own profile" 
ON public.tenant_profiles 
FOR ALL 
USING (auth.uid() = id);

-- Create index for faster slug lookup
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_slug ON public.tenant_profiles(slug);
