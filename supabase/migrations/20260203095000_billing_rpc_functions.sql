-- Atomic function to increment SMS spend
CREATE OR REPLACE FUNCTION public.increment_sms_spend(t_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenant_subscriptions
    SET sms_usage_spend = COALESCE(sms_usage_spend, 0) + amount,
        updated_at = NOW()
    WHERE tenant_id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic function to increment Voice spend
CREATE OR REPLACE FUNCTION public.increment_voice_spend(t_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenant_subscriptions
    SET voice_usage_spend = COALESCE(voice_usage_spend, 0) + amount,
        updated_at = NOW()
    WHERE tenant_id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_sms_spend IS 'Increments the SMS usage spend for a tenant atomically';
COMMENT ON FUNCTION public.increment_voice_spend IS 'Increments the Voice usage spend for a tenant atomically';
