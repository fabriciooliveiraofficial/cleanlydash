-- Script to RESTORE Admin Permissions
-- Use this if your Admin user lost access (became Guest)

DO $$
DECLARE
    -- REPLACE With your Admin Email
    target_email TEXT := 'admin@airgoverness.com'; 
    target_user_id UUID;
BEGIN
    -- 1. Find User
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Restoring Admin: % (ID: %)', target_email, target_user_id;

        -- 2. Remove from Team Members (to avoid conflict/downgrade to 'staff')
        DELETE FROM public.team_members WHERE user_id = target_user_id;
        
        -- 3. Restore into user_roles as Super Admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin'::app_role) -- or 'property_owner'
        ON CONFLICT (user_id) DO UPDATE
        SET role = 'super_admin'::app_role;

        RAISE NOTICE 'SUCCESS: % is now Super Admin again.', target_email;
    ELSE
        RAISE NOTICE 'ERROR: User % not found in Auth.', target_email;
    END IF;
END $$;
