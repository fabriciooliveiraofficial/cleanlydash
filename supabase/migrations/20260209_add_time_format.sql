-- Add time_format column to tenant_profiles
ALTER TABLE tenant_profiles 
ADD COLUMN IF NOT EXISTS time_format VARCHAR(5) DEFAULT '12h';

-- Comment on column
COMMENT ON COLUMN tenant_profiles.time_format IS 'Preferred time format for display: 12h or 24h';
