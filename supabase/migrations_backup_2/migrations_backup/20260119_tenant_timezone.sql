-- Add timezone and coordinates columns to tenant_profiles
-- This enables timezone detection based on company address

ALTER TABLE public.tenant_profiles
ADD COLUMN IF NOT EXISTS company_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS company_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

COMMENT ON COLUMN public.tenant_profiles.company_lat IS 'Latitude coordinate of company address';
COMMENT ON COLUMN public.tenant_profiles.company_lng IS 'Longitude coordinate of company address';
COMMENT ON COLUMN public.tenant_profiles.timezone IS 'IANA timezone identifier (e.g., America/Sao_Paulo)';
