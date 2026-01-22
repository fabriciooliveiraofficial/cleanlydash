-- 1. Tenant Notification Settings Table
-- Stores preferences for system alerts (Email, SMS, Push)
CREATE TABLE IF NOT EXISTS public.tenant_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
    
    -- Channel Toggles
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,

    -- Event Preferences (JSONB for flexibility)
    -- Structure: { "new_booking": true, "booking_cancelled": true, "payment_failed": true, "low_balance": true }
    events JSONB DEFAULT '{
        "new_booking": true,
        "booking_cancelled": true,
        "payment_failed": true,
        "low_balance": true,
        "new_review": false
    }'::jsonb,

    -- Recipients Configuration
    -- Structure: { "emails": ["admin@example.com"], "phones": ["+123456789"] }
    recipients JSONB DEFAULT '{"emails": [], "phones": []}'::jsonb,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one setting row per tenant
    CONSTRAINT unique_tenant_settings UNIQUE (tenant_id)
);

-- 2. RLS Policies
ALTER TABLE public.tenant_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own settings" ON public.tenant_notification_settings
FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Tenants update own settings" ON public.tenant_notification_settings
FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Tenants insert own settings" ON public.tenant_notification_settings
FOR INSERT WITH CHECK (tenant_id = auth.uid());

-- 3. Trigger to Auto-create settings on Tenant Creation
-- (Optional, but good UX. For now, frontend will handle "upsert" or lazy creation)
