-- Migration: 20240113_fix_global_traffic.sql
-- Purpose: Allow Session Tracking and Super Admin Visibility

-- 1. Ensure Table Exists (already done in 20240109 but let's be safe/update)
-- We need to ensure users can INSERT/UPDATE their own sessions

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.active_sessions;
CREATE POLICY "Users can insert own sessions"
    ON public.active_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.active_sessions;
CREATE POLICY "Users can update own sessions"
    ON public.active_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- 2. Super Admin Visibility
-- Allow super_admin to SELECT ALL rows
DROP POLICY IF EXISTS "Super Admins can view all sessions" ON public.active_sessions;
CREATE POLICY "Super Admins can view all sessions"
    ON public.active_sessions FOR SELECT
    USING (
        (auth.uid() = user_id) -- Own sessions
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- 3. Cleanup Old Sessions (Optional Helper)
-- To be run by a cron job or lazily
-- DELETE FROM public.active_sessions WHERE last_active_at < NOW() - INTERVAL '1 hour';
