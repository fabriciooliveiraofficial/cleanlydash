-- Migration: 20240112_platform_config.sql
-- Purpose: Store global platform configuration and secrets (Alternative to Env Vars)

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only Service Role or Super Admin can read
-- For simplicity in Edge Functions (which use Service Role usually or Auth User), we need to be careful.
-- Edge Functions often use SERVICE_ROLE_KEY to bypass RLS when fetching config.
-- But if called with logged-in user, we need a policy.

CREATE POLICY "Allow Service Role full access"
    ON public.platform_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow Admins read access"
    ON public.platform_settings
    FOR SELECT
    TO authenticated
    USING (
         (select role from public.user_roles where user_id = auth.uid()) = 'super_admin'
    );

-- Insert placeholder keys
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('TELNYX_API_KEY', 'placeholder', 'Global Telnyx API Key V2'),
    ('TELNYX_SIP_CREDENTIAL_ID', 'placeholder', 'Global SIP Connection ID for WebRTC')
ON CONFLICT (key) DO NOTHING;
