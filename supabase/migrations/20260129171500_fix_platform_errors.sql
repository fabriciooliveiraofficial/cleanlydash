-- Migration: 20260129171500_fix_platform_errors.sql
-- Purpose: Fix RLS policies for platform_settings and add missing columns to active_sessions.

-- 1. FIX active_sessions table
DO $$ 
BEGIN
    -- Add context column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'context') THEN
        ALTER TABLE public.active_sessions ADD COLUMN context TEXT DEFAULT 'tenant';
    END IF;

    -- Add last_seen column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'last_seen') THEN
        ALTER TABLE public.active_sessions ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Update Uniqueness for Session Guard
-- The hook usePlatformSessionGuard expects onConflict: 'user_id,context'
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_session_id_key;
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_context_key;
ALTER TABLE public.active_sessions ADD CONSTRAINT active_sessions_user_id_context_key UNIQUE (user_id, context);

-- 3. FIX platform_settings RLS
-- Remove old restrictive policy
DROP POLICY IF EXISTS "Allow Admins read access" ON public.platform_settings;

-- Create comprehensive policy for Super Admins
CREATE POLICY "Allow Super Admins full access"
    ON public.platform_settings
    FOR ALL
    TO authenticated
    USING (
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    )
    WITH CHECK (
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
