-- Script to delete a user by email to allow reuse
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    -- REPLACE THIS EMAIL WITH THE TARGET EMAIL
    target_email TEXT := 'cliente1@airgoverness.com'; 
    target_user_id UUID;
BEGIN
    -- 1. Find User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Deleting user: % (ID: %)', target_email, target_user_id;

        -- 2. Delete from team_members (Cleanup references)
        -- Note: If this user has Bookings, this might fail unless ON DELETE CASCADE is set on bookings.cleaner_id
        -- We try to clean up team_members first.
        DELETE FROM public.team_members WHERE user_id = target_user_id;
        
        -- 3. Delete from user_roles (Legacy/Global)
        DELETE FROM public.user_roles WHERE user_id = target_user_id;

        -- 4. Delete from auth.users (The Account itself)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'User % has been fully removed.', target_email;
    ELSE
        RAISE NOTICE 'User % not found in auth.users.', target_email;
        
        -- Optional: Check team_members by email just in case the auth was deleted but member remained
        DELETE FROM public.team_members WHERE email = target_email;
        IF FOUND THEN
             RAISE NOTICE 'Orphaned team member with email % was removed.', target_email;
        END IF;
    END IF;
END $$;
