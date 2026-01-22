-- Migration: Notification Infrastructure (Push & Staff History)
-- Description: Adds push_subscriptions table for browser push tokens and notification_history for tracking.

-- 1. Create Push Subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_json JSONB NOT NULL,
    device_type TEXT, -- 'mobile', 'desktop', 'pwa'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subscription_json)
);

-- 2. Create Staff Notification History table
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- the recipient
    type TEXT NOT NULL, -- 'email', 'sms', 'push'
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'acknowledged', 'failed'
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id UUID REFERENCES public.tenants(id)
);

-- 3. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own push_subscriptions" ON public.push_subscriptions
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Staff can view their own notification history
CREATE POLICY "Users can view own notification_history" ON public.notification_history
    USING (auth.uid() = user_id OR auth.uid() = tenant_id);

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload config';
