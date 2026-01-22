-- Remove strict unique constraints that might block registration
-- We want to allow multiple users/tenants to generic phone numbers or emails if needed (e.g. testing)
-- Uniqueness is already enforced at auth.users level for email.

DO $$
BEGIN
    -- Drop phone constraint if exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_profiles_phone_key') THEN
        ALTER TABLE public.tenant_profiles DROP CONSTRAINT tenant_profiles_phone_key;
    END IF;

    -- Drop email constraint if exists (auth.users handles this, tenant_profiles shouldn't block)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_profiles_email_key') THEN
        ALTER TABLE public.tenant_profiles DROP CONSTRAINT tenant_profiles_email_key;
    END IF;

END $$;
