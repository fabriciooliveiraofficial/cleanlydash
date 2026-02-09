-- Add business_hours column to tenant_profiles
ALTER TABLE tenant_profiles 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}'::jsonb;

-- Comment on column
COMMENT ON COLUMN tenant_profiles.business_hours IS 'Global business hours configuration. Format: {start: "HH:mm", end: "HH:mm", days: [1,2,3,4,5]}';
