-- MIGRATION: Update All Plans to Real USD Prices & Limits
-- Based on landing/PricingSection.tsx

-- 1. FIX CONSTRAINTS
-- We need to allow new plan types ('combo', 'telephony')
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_type_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_type_check CHECK (type IN ('system', 'combo', 'telephony', 'default', 'custom'));

-- 2. Ensure currency column is present (idempotent)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- 3. Upsert Plans
INSERT INTO public.plans (id, type, name, price_monthly_usd, currency, features, limits) VALUES

-- SYSTEM PLANS
('system_essentials', 'system', 'Essentials', 29.90, 'USD', 
  '["Full System Access", "Property Management", "Task Automation", "Mobile App for Cleaners"]',
  '{"users": 2}'
),
('system_business', 'system', 'Business', 39.90, 'USD', 
  '["Everything in Essentials", "Advanced Analytics", "Inventory Management", "API Access"]',
  '{"users": 4}'
),

-- COMBO PLANS
('founders_combo', 'combo', 'Founders', 49.90, 'USD', 
  '["Full System", "Local Number (US)", "Call Recording", "Voicemail Transcription"]',
  '{"users": 2, "minutes": 150}'
),
('solopreneur_combo', 'combo', 'Solopreneur', 69.90, 'USD', 
  '["All Founders features", "Voice Menus (IVR)", "Call Queues", "SMS Marketing"]',
  '{"users": 4, "minutes": 600}'
),
('growth_team_combo', 'combo', 'Growth Team', 99.90, 'USD', 
  '["Solopreneur Features", "Power Dialer", "Real-time Monitoring", "Advanced CRM"]',
  '{"users": 5, "minutes": 1500}'
),

-- TELEPHONY PLANS
('voice_starter', 'telephony', 'Voice Starter', 14.99, 'USD', 
  '["Business Line Only", "Web & Mobile Apps", "Call Recording", "Voicemail Drop"]',
  '{"users": 1, "minutes": 150}'
),
('voice_pro', 'telephony', 'Voice Pro', 34.99, 'USD', 
  '["All Starter features", "Call Queues", "Voice Menus (IVR)", "Warm Transfers"]',
  '{"users": 3, "minutes": 600}'
),
('voice_scale', 'telephony', 'Voice Scale', 89.99, 'USD', 
  '["All Pro features", "Power Dialer", "Sentiment Analysis", "Advanced Reporting"]',
  '{"users": 5, "minutes": 1500}'
)

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    currency = EXCLUDED.currency,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits;

-- Notify
NOTIFY pgrst, 'reload config';
