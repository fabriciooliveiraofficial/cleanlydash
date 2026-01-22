-- Script to FIX Admin Team Link
-- Use this if 'Restore Admin' caused data to disappear

DO $$
DECLARE
    target_email TEXT := 'admin@cleanlydash.com'; 
    target_user_id UUID;
    target_tenant_id UUID;
BEGIN
    -- 1. Find User
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    -- 2. Find their Tenant (Assuming they are the owner)
    -- If they are owner, usually id matches user_id, or we check tenant_profiles
    SELECT id INTO target_tenant_id FROM public.tenant_profiles WHERE id = target_user_id;
    
    -- If not found by ID, maybe they are a member of another tenant?
    -- For 'admin@airgoverness.com', they are likely the Platform Owner (First Tenant)
    IF target_tenant_id IS NULL THEN
        SELECT id INTO target_tenant_id FROM public.tenant_profiles ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF target_user_id IS NOT NULL AND target_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Restoring Team Link for: %', target_email;

        -- 3. Insert into team_members
        INSERT INTO public.team_members (user_id, tenant_id, role, status, email, name)
        VALUES (
            target_user_id, 
            target_tenant_id, 
            'super_admin'::app_role, 
            'active', 
            target_email, 
            'Admin User'
        )
        ON CONFLICT (user_id, tenant_id) 
        DO UPDATE SET role = 'super_admin'::app_role, status = 'active';
        
        RAISE NOTICE 'SUCCESS: Team link restored.';
    ELSE
        RAISE NOTICE 'ERROR: Could not find User or Tenant.';
    END IF;
END $$;
