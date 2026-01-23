-- BILLING SCHEMA UPDATE

-- 1. Ensure tenant_profiles has stripe_customer_id
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Ensure tenant_subscriptions table exists
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    tenant_id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
    plan_id TEXT,
    status TEXT, -- active, trialing, past_due, canceled
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ai_credits INTEGER DEFAULT 0 -- For usage-based AI features
);

-- 3. Enable RLS
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Tenants can view own subscription"
ON public.tenant_subscriptions FOR SELECT
USING (tenant_id = auth.uid());

-- 5. Notify
NOTIFY pgrst, 'reload config';
