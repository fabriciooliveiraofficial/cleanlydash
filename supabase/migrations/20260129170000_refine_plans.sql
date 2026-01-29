-- MIGRATION: Refine Subscription Plans
-- Restricts the platform to a specific list of plans and renames them.

-- 1. Create temporary mapping for voice_scale to voice_sale if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM public.plans WHERE id = 'voice_scale') THEN
        -- Check if voice_sale already exists
        IF NOT EXISTS (SELECT 1 FROM public.plans WHERE id = 'voice_sale') THEN
            -- Insert voice_sale with voice_scale data
            INSERT INTO public.plans (id, type, name, price_monthly_usd, currency, features, limits)
            SELECT 'voice_sale', type, 'Voice Sale', price_monthly_usd, currency, features, limits
            FROM public.plans WHERE id = 'voice_scale';
            
            -- Update subscriptions to point to new ID
            UPDATE public.tenant_subscriptions SET plan_id = 'voice_sale' WHERE plan_id = 'voice_scale';
            
            -- Delete old record
            DELETE FROM public.plans WHERE id = 'voice_scale';
        END IF;
    END IF;
END $$;

-- 2. Upsert/Update the approved list of plans
INSERT INTO public.plans (id, type, name, price_monthly_usd, currency, features, limits) VALUES

-- TELEPHONY
('voice_starter', 'telephony', 'Voice starter', 14.99, 'USD', 
  '["Business Line Only", "Web & Mobile Apps", "Call Recording", "Voicemail Drop"]',
  '{"users": 1, "minutes": 150}'
),
('voice_pro', 'telephony', 'Voice pro', 34.99, 'USD', 
  '["All Starter features", "Call Queues", "Voice Menus (IVR)", "Warm Transfers"]',
  '{"users": 3, "minutes": 600}'
),
('voice_sale', 'telephony', 'Voice Sale', 89.99, 'USD', 
  '["All Pro features", "Power Dialer", "Sentiment Analysis", "Advanced Reporting"]',
  '{"users": 5, "minutes": 1500}'
),

-- BOOKING SYSTEM
('system_essentials', 'system', 'Plano Essentials', 29.90, 'USD', 
  '["Full System Access", "Property Management", "Task Automation", "Mobile App for Cleaners"]',
  '{"users": 2}'
),
('system_business', 'system', 'Plano Business', 39.90, 'USD', 
  '["Everything in Essentials", "Advanced Analytics", "Inventory Management", "API Access"]',
  '{"users": 4}'
),

-- COMBOS + VOZ
('founders_combo', 'combo', 'Founders', 49.90, 'USD', 
  '["Full System", "Local Number (US)", "Call Recording", "Voicemail Transcription"]',
  '{"users": 2, "minutes": 150}'
),
('solopreneur_combo', 'combo', 'Solopreneur', 69.90, 'USD', 
  '["All Founders features", "Voice Menus (IVR)", "Call Queues", "SMS Marketing"]',
  '{"users": 4, "minutes": 600}'
),
('growth_team_combo', 'combo', 'Growth team', 99.90, 'USD', 
  '["Solopreneur Features", "Power Dialer", "Real-time Monitoring", "Advanced CRM"]',
  '{"users": 5, "minutes": 1500}'
)

ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    currency = EXCLUDED.currency,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits;

-- 3. REMOVE ANY PLAN NOT IN THE LIST
DELETE FROM public.plans 
WHERE id NOT IN (
    'voice_starter', 'voice_pro', 'voice_sale', 
    'system_essentials', 'system_business', 
    'founders_combo', 'solopreneur_combo', 'growth_team_combo'
);

-- Notify
NOTIFY pgrst, 'reload config';
