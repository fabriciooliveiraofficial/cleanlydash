-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    app_context TEXT CHECK (app_context IN ('platform', 'tenant', 'cleaner')) NOT NULL,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 2. Enhance tenant_notification_settings (if not exists with correct columns)
CREATE TABLE IF NOT EXISTS public.tenant_notification_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    events JSONB DEFAULT '{
        "new_booking": true,
        "booking_cancelled": true,
        "payment_failed": true,
        "low_balance": true,
        "new_review": true,
        "support_reply": true,
        "checklist_completed": true,
        "checkin_alert": true
    }'::jsonb,
    recipients JSONB DEFAULT '{
        "emails": [],
        "phones": []
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for tenant_notification_settings
ALTER TABLE public.tenant_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own notification settings" ON public.tenant_notification_settings
    FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Notification History for UI/Audit
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT, -- operational, communication, financial
    data JSONB, -- { "url": "/bookings/123" }
    status TEXT DEFAULT 'sent', -- sent, failed, read
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" ON public.notification_history
    FOR SELECT USING (auth.uid() = user_id);
    
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_push_user_context ON public.push_subscriptions(user_id, app_context);
