-- Migration: 20240113_seed_features.sql
-- Purpose: Populate the 'features' JSONB column in public.plans with the definitive list of allowed capabilities.

-- 1. System Essentials
UPDATE public.plans 
SET features = '["multi_calendar", "unified_inbox", "checkin_instructions"]'::jsonb
WHERE id = 'system_essentials';

-- 2. System Business
UPDATE public.plans 
SET features = '["multi_calendar", "unified_inbox", "owner_access", "financial_reports", "checkin_instructions"]'::jsonb
WHERE id = 'system_business';

-- 3. System Enterprise
UPDATE public.plans 
SET features = '["multi_calendar", "unified_inbox", "owner_access", "financial_reports", "checkin_instructions", "api_access", "white_label"]'::jsonb
WHERE id = 'system_enterprise';

-- 4. Voice Starter
UPDATE public.plans 
SET features = '["global_dialer", "sms_mms"]'::jsonb
WHERE id = 'voice_starter';

-- 5. Voice Pro
UPDATE public.plans 
SET features = '["global_dialer", "sms_mms", "call_recording"]'::jsonb
WHERE id = 'voice_pro';

-- 6. Voice Scale
UPDATE public.plans 
SET features = '["global_dialer", "sms_mms", "call_recording", "campaigns"]'::jsonb
WHERE id = 'voice_scale';

-- Note: Combos don't have 'features' column directly, they inherit from included_plan_ids.
-- logic: Tenant Subscription links to Plan OR Combo.
-- If Combo, we must aggregate features from all plans in `included_plan_ids`.

-- Function to get Tenant Features
CREATE OR REPLACE FUNCTION public.get_tenant_features(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_features JSONB := '[]'::jsonb;
    v_plan_id TEXT;
    v_combo_id TEXT;
    v_included_plans TEXT[];
    v_plan_features JSONB;
BEGIN
    -- Get active subscription
    SELECT plan_id, combo_id INTO v_plan_id, v_combo_id
    FROM public.tenant_subscriptions
    WHERE tenant_id = p_tenant_id AND status = 'active'
    LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
        -- Direct Plan
        SELECT features INTO v_features FROM public.plans WHERE id = v_plan_id;
    ELSIF v_combo_id IS NOT NULL THEN
        -- Combo: Aggregate features from all included plans
        SELECT included_plan_ids INTO v_included_plans FROM public.combos WHERE id = v_combo_id;
        
        -- Loop through plans and merge arrays
        -- Postgres jsonb concatenation: A || B
        SELECT jsonb_agg(DISTINCT elem) INTO v_features
        FROM (
            SELECT jsonb_array_elements_text(p.features) as elem
            FROM public.plans p
            WHERE p.id = ANY(v_included_plans)
        ) sub;
    ELSE
         -- No active sub? Return empty or basic free tier if exists
         RETURN '[]'::jsonb;
    END IF;

    RETURN COALESCE(v_features, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
