-- Script to Grant Super Admin Access (SAFE)
-- Keeps tenant data visible while granting superpowers.

DO $$
DECLARE
    target_email TEXT := 'fabriciooliveiraofficial@gmail.com'; 
    target_user_id UUID;
BEGIN
    -- 1. Find User
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Elevating User: %', target_email;

        -- 2. Upgrade Team Member Role (So you stay in the tenant but become God)
        UPDATE public.team_members 
        SET role = 'super_admin'::app_role 
        WHERE user_id = target_user_id;
        
        -- 3. Grant Global Role (For Platform Ops/Fallback)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin'::app_role)
        ON CONFLICT (user_id) DO UPDATE
        SET role = 'super_admin'::app_role;

        RAISE NOTICE 'SUCCESS: % is now Super Admin.', target_email;
    ELSE
        RAISE NOTICE 'ERROR: User % not found. Did you create the account?', target_email;
    END IF;
END $$;
