-- Hardening Telephony Isolation: telnyx_settings RLS
ALTER TABLE public.telnyx_settings ENABLE ROW LEVEL SECURITY;

-- 1. Ensure Users can ONLY view their own settings
DROP POLICY IF EXISTS "Users can view own Telnyx settings" ON public.telnyx_settings;
CREATE POLICY "Users can view own Telnyx settings" ON public.telnyx_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Ensure Users can ONLY update their own settings (but not critical managed fields if we wanted to be even stricter)
-- For now, they can update their own row.
DROP POLICY IF EXISTS "Users can update own settings" ON public.telnyx_settings;
CREATE POLICY "Users can update own settings" ON public.telnyx_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Delete policy
DROP POLICY IF EXISTS "Users can delete own settings" ON public.telnyx_settings;
CREATE POLICY "Users can delete own settings" ON public.telnyx_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Service Role bypass is automatic in Supabase, but we can be explicit if needed.
-- Policies below are just for documentation of intent.

COMMENT ON TABLE public.telnyx_settings IS 'Tenant-specific Telnyx configuration with RLS enforcement.';
