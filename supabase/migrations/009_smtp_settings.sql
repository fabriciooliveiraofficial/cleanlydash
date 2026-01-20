-- Create table for Tenant SMTP Settings
CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The admin/owner who owns these settings
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 587,
    username TEXT NOT NULL,
    password TEXT NOT NULL, -- In production, this should be encrypted (Vault) or stored in Edge Config. Storing plain/base64 for MVP demo.
    secure BOOLEAN DEFAULT TRUE,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- One setting per user (acting as tenant) for now
);

-- RLS
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own settings
CREATE POLICY "Users can manage own SMTP settings" ON public.smtp_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
