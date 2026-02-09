-- Update business_hours structure in tenant_profiles
-- New Format: { "0": {"start": "08:00", "end": "18:00", "active": false}, ... }

DO $$
BEGIN
    -- Initialize with a standard schedule if it doesn't look like the new format
    -- 0=Sun, 1=Mon, ..., 6=Sat
    UPDATE tenant_profiles
    SET business_hours = '{
        "0": {"start": "08:00", "end": "18:00", "active": false},
        "1": {"start": "08:00", "end": "18:00", "active": true},
        "2": {"start": "08:00", "end": "18:00", "active": true},
        "3": {"start": "08:00", "end": "18:00", "active": true},
        "4": {"start": "08:00", "end": "18:00", "active": true},
        "5": {"start": "08:00", "end": "18:00", "active": true},
        "6": {"start": "08:00", "end": "18:00", "active": false}
    }'::jsonb
    WHERE business_hours IS NULL OR NOT (business_hours ? '1');
END $$;
