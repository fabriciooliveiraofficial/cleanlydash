-- Migration 028: Sync Tenants and Tenant Profiles
-- Ensures the legacy 'tenants' table is synced with 'tenant_profiles'

-- 1. Ensure 'tenants' exists (in case it was created manually or by a missing migration)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    stripe_customer_id TEXT,
    telnyx_api_key TEXT,
    telnyx_connection_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Backfill existing data
INSERT INTO public.tenants (id, name, slug, logo_url, created_at)
SELECT id, name, slug, logo_url, created_at 
FROM public.tenant_profiles
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    logo_url = EXCLUDED.logo_url;

-- 3. Trigger to maintain sync
CREATE OR REPLACE FUNCTION public.sync_tenant_profiles_to_tenants()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenants (id, name, slug, logo_url)
    VALUES (new.id, new.name, new.slug, new.logo_url)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        logo_url = EXCLUDED.logo_url;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_tenant_profiles ON public.tenant_profiles;
CREATE TRIGGER tr_sync_tenant_profiles
AFTER INSERT OR UPDATE ON public.tenant_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_profiles_to_tenants();

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
