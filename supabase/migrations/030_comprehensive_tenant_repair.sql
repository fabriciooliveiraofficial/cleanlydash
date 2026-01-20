-- Migration 030: Comprehensive Tenant Integrity Repair
-- This script ensures all users who need a tenant record have one, and fixes orphaned data.

-- 1. Ensure 'tenants' exists and has correct structure (re-iterating for safety)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Backfill from 'tenant_profiles'
-- This covers Owners who have a profile but no legacy tenant record
INSERT INTO public.tenants (id, name, slug, logo_url, created_at)
SELECT id, name, slug, logo_url, created_at 
FROM public.tenant_profiles
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    logo_url = EXCLUDED.logo_url;

-- 3. Create tenants for users who are already in 'team_members' if they point to an owner who is missing in 'tenants'
-- First, identify owners from 'team_members' and ensure they have a tenant record
INSERT INTO public.tenants (id, name, slug)
SELECT DISTINCT tenant_id, 'Empresa de ' || tenant_id, 'tenant-' || substr(tenant_id::text, 1, 8)
FROM public.team_members
WHERE tenant_id NOT IN (SELECT id FROM public.tenants)
ON CONFLICT (id) DO NOTHING;

-- 4. Fix potential issues where 'bookings' might have been created with a user_id instead of a tenant_id
-- (Though the foreign key usually prevents this, if the constraint was added later, it might be an issue)
-- In this case, the constraint IS the problem because it's failing the INSERT.

-- 5. Final Sync Trigger (Solidified)
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

-- 6. Grant Permissions (Ensuring API can see the synced data)
GRANT ALL ON TABLE public.tenants TO postgres, service_role, authenticated;

-- 7. Refresh Schema Cache
NOTIFY pgrst, 'reload config';
