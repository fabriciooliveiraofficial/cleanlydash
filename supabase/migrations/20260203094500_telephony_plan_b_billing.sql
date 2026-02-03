-- 1. Add messaging_profile_id to telnyx_settings
ALTER TABLE public.telnyx_settings 
ADD COLUMN IF NOT EXISTS messaging_profile_id TEXT;

COMMENT ON COLUMN public.telnyx_settings.messaging_profile_id IS 'ID of the Telnyx Messaging Profile created for this tenant';

-- 2. Add usage tracking columns to tenant_subscriptions
-- We use these to track spend in the current cycle
ALTER TABLE public.tenant_subscriptions 
ADD COLUMN IF NOT EXISTS voice_usage_spend NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_usage_spend NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS mms_usage_spend NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rcs_usage_spend NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.tenant_subscriptions.voice_usage_spend IS 'Total spent on voice calls in the current billing cycle';
COMMENT ON COLUMN public.tenant_subscriptions.sms_usage_spend IS 'Total spent on SMS in the current billing cycle';

-- 3. Update plans table with telephony quotas (defaults)
-- We'll use the existing 'limits' JSONB column, but let's ensure it has structure
-- This is just a comment to remind us to populate 'limits' with {"voice_budget": 37.00, "sms_budget": 10.00}
