-- Add new columns to tenant_profiles for extended company information
ALTER TABLE public.tenant_profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS ein TEXT,  -- EIN / Tax ID (renamed from cnpj for US market)
ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.tenant_profiles.ein IS 'Employer Identification Number (US Tax ID)';
COMMENT ON COLUMN public.tenant_profiles.business_type IS 'Type of business: hotel, vacation_rental, property_manager, cleaning_company, hospitality, other';
