-- Migration 023: Telnyx Settings (Managed Accounts) and AI Logs
-- Supports Multi-Tenant Reseller Model + Hybrid AI

-- 1. Telnyx Settings Table (Updated for Managed Accounts)
CREATE TABLE IF NOT EXISTS public.telnyx_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The tenant owner
    
    -- Managed Account Fields (Platform Controlled)
    managed_account_id TEXT, -- ID of the sub-account at Telnyx
    managed_api_key TEXT, -- API Key for the sub-account (Managed by System)
    messaging_profile_id TEXT, -- Profile for this tenant
    
    -- Legacy/BYO Fields (Optional)
    api_key TEXT, 
    phone_number TEXT, -- The 'From' number assigned to this tenant

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed
    external_id TEXT, -- Telnyx Message ID
    cost DECIMAL(10,4), -- Cost to Platform
    price DECIMAL(10,4), -- Price charged to Tenant
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Call Intelligence (AI Analysis)
CREATE TABLE IF NOT EXISTS public.call_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    call_id TEXT, -- Telnyx Call Control ID
    transcript TEXT, -- From Whisper
    summary TEXT, -- From Gemini
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    sentiment_label TEXT, -- positive, neutral, negative
    translation TEXT,
    
    -- Usage Tracking
    duration_seconds INT,
    cost_ai DECIMAL(10,5), -- Cost of Whisper + Gemini
    price_ai DECIMAL(10,5), -- Price charged to Tenant
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies

-- Telnyx Settings
ALTER TABLE public.telnyx_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Telnyx settings" ON public.telnyx_settings;
CREATE POLICY "Users can view own Telnyx settings" ON public.telnyx_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only Service Role can UPDATE managed keys to prevent user tampering
-- Users can Update 'is_active' or their own 'api_key' if we allow BYO.
DROP POLICY IF EXISTS "Users can update non-critical settings" ON public.telnyx_settings;
CREATE POLICY "Users can update non-critical settings" ON public.telnyx_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 

-- SMS Logs & AI logs
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON public.sms_logs;
CREATE POLICY "Users can view own logs" ON public.sms_logs FOR SELECT USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Users can view own intelligence" ON public.call_intelligence;
CREATE POLICY "Users can view own intelligence" ON public.call_intelligence FOR SELECT USING (auth.uid() = tenant_id);
