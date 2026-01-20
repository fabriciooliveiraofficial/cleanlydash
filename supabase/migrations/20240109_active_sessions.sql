-- Create active_sessions table for Concurrent Session Control
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL, -- Corresponds to Supabase Auth Session ID or unique client token
    device_fingerprint TEXT NOT NULL, -- ClientJS hash or similar
    device_info JSONB DEFAULT '{}'::jsonb, -- User Agent, OS, Browser
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- RLS: Users can see their own sessions
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON public.active_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Only Service Role can insert/delete (handled by Edge Function for security)
-- Or allow users to delete (revoke) their own sessions
CREATE POLICY "Users can delete their own sessions"
    ON public.active_sessions FOR DELETE
    USING (auth.uid() = user_id);
