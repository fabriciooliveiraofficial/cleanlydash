-- Migration: 20260203100000_ensure_session_constraints.sql
-- Purpose: Ensure the active_sessions table has the correct unique constraint for the session guard.

-- 1. Ensure columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'context') THEN
        ALTER TABLE public.active_sessions ADD COLUMN context TEXT DEFAULT 'tenant';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'last_seen') THEN
        ALTER TABLE public.active_sessions ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Ensure unique constraint (user_id, context)
-- Drop existing conflicting constraints first
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_session_id_key;
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_context_key;

-- Add the specific constraint required by usePlatformSessionGuard
ALTER TABLE public.active_sessions ADD CONSTRAINT active_sessions_user_id_context_key UNIQUE (user_id, context);

-- 3. Grant necessary permissions
GRANT ALL ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload config';
