-- REAL PLANS FOR AIRGOVERNESS
-- This migration inserts the plans shown in the UI and used in the platform.

-- Ensure plans table is up to date
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- Insert / Update the plans
INSERT INTO public.plans (id, type, name, price_monthly_usd, currency, features, limits) VALUES
('plan_pro', 'system', 'Pro', 299.00, 'BRL', 
  '["Gestão Completa", "Multi-Crew", "App do Cleaner", "Pagamentos Online"]',
  '{"users": 5}'
),
('plan_enterprise', 'system', 'Enterprise', 599.00, 'BRL',
  '["Tudo do Pro", "IA Avançada", "Suporte Dedicado", "API Acesso"]',
  '{"users": 999}'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    currency = EXCLUDED.currency,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits;

-- Notify
NOTIFY pgrst, 'reload config';
