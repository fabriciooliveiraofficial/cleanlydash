-- Script to Restore Plans (if missing)
-- Run this if "Criar Conta" fails with "Plan not found"

-- 1. Plans
INSERT INTO public.plans (id, type, name, price_monthly_usd, limits) VALUES
('system_essentials', 'system', 'Essentials', 29.00, '{"users": 2}'),
('system_business', 'system', 'Business', 59.00, '{"users": 5}'),
('system_enterprise', 'system', 'Enterprise', 299.00, '{"users": 999}'),
('voice_starter', 'telephony', 'Voice Starter', 14.99, '{"minutes": 150, "sms": 50, "mms": 20}'),
('voice_pro', 'telephony', 'Voice Pro', 34.99, '{"minutes": 600, "sms": 600, "mms": 50}'),
('voice_scale', 'telephony', 'Voice Scale', 89.99, '{"minutes": 1500, "sms": 1500, "mms": 100}')
ON CONFLICT (id) DO UPDATE SET price_monthly_usd = EXCLUDED.price_monthly_usd, limits = EXCLUDED.limits;

-- 2. Combos
INSERT INTO public.combos (id, name, price_monthly_usd, included_plan_ids) VALUES
('founders_combo', 'Founders Combo', 29.90, ARRAY['system_essentials', 'voice_starter']),
('solopreneur_combo', 'Solopreneur Combo', 39.00, ARRAY['system_essentials', 'voice_starter']),
('growth_team_combo', 'Growth Team Combo', 89.00, ARRAY['system_business', 'voice_pro'])
ON CONFLICT (id) DO UPDATE SET price_monthly_usd = EXCLUDED.price_monthly_usd, included_plan_ids = EXCLUDED.included_plan_ids;

-- Plans and Combos Restored.
