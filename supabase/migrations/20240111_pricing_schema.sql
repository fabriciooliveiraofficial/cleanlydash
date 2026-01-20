-- 0. Cleanup Conflicts from Previous Schema (Migration 024)
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP FUNCTION IF EXISTS public.create_wallet_for_user();
DROP TABLE IF EXISTS public.wallets CASCADE; 
-- Note: CASCADE will also drop wallet_transactions if it exists, which is intended as we are rebuilding the wallet system.

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY, -- e.g. 'system_essentials', 'voice_starter'
  type TEXT NOT NULL CHECK (type IN ('system', 'telephony')),
  name TEXT NOT NULL,
  price_monthly_usd NUMERIC(10, 2) NOT NULL,
  limits JSONB DEFAULT '{}'::jsonb, -- e.g. { "users": 2, "minutes": 150 }
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Combos Table
CREATE TABLE IF NOT EXISTS public.combos (
  id TEXT PRIMARY KEY, -- e.g. 'founders_combo'
  name TEXT NOT NULL,
  price_monthly_usd NUMERIC(10, 2) NOT NULL,
  included_plan_ids TEXT[] NOT NULL, -- Array of plan_ids
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tenant Subscriptions
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.plans(id),
  combo_id TEXT REFERENCES public.combos(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_plan_or_combo CHECK (plan_id IS NOT NULL OR combo_id IS NOT NULL)
);

-- 4. Wallets (for AI & Overage) - Recreated with tenant_id
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC(10, 2) DEFAULT 0.00,
  auto_recharge_threshold NUMERIC(10, 2) DEFAULT 10.00,
  auto_recharge_amount NUMERIC(10, 2) DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Public read access for plans and combos
DROP POLICY IF EXISTS "Public read plans" ON public.plans;
CREATE POLICY "Public read plans" ON public.plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read combos" ON public.combos;
CREATE POLICY "Public read combos" ON public.combos FOR SELECT USING (true);

-- Tenant access
DROP POLICY IF EXISTS "Tenant read own subscription" ON public.tenant_subscriptions;
CREATE POLICY "Tenant read own subscription" ON public.tenant_subscriptions 
  FOR SELECT USING (auth.uid() = tenant_id); 

DROP POLICY IF EXISTS "Tenant read own wallet" ON public.wallets;
CREATE POLICY "Tenant read own wallet" ON public.wallets 
  FOR SELECT USING (auth.uid() = tenant_id);

-- Initial Data Seeding
INSERT INTO public.plans (id, type, name, price_monthly_usd, limits) VALUES
('system_essentials', 'system', 'Essentials', 29.00, '{"users": 2}'),
('system_business', 'system', 'Business', 59.00, '{"users": 5}'),
('system_enterprise', 'system', 'Enterprise', 299.00, '{"users": 999}'),
('voice_starter', 'telephony', 'Voice Starter', 14.99, '{"minutes": 150, "sms": 50, "mms": 20}'),
('voice_pro', 'telephony', 'Voice Pro', 34.99, '{"minutes": 600, "sms": 600, "mms": 50}'),
('voice_scale', 'telephony', 'Voice Scale', 89.99, '{"minutes": 1500, "sms": 1500, "mms": 100}')
ON CONFLICT (id) DO UPDATE SET price_monthly_usd = EXCLUDED.price_monthly_usd, limits = EXCLUDED.limits;

INSERT INTO public.combos (id, name, price_monthly_usd, included_plan_ids) VALUES
('founders_combo', 'Founders Combo', 29.90, ARRAY['system_essentials', 'voice_starter']),
('solopreneur_combo', 'Solopreneur Combo', 39.00, ARRAY['system_essentials', 'voice_starter']),
('growth_team_combo', 'Growth Team Combo', 89.00, ARRAY['system_business', 'voice_pro'])
ON CONFLICT (id) DO UPDATE SET price_monthly_usd = EXCLUDED.price_monthly_usd, included_plan_ids = EXCLUDED.included_plan_ids;

-- Update handle_new_tenant trigger to handle plan_id and create wallet
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
DECLARE
  tenant_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  suffix TEXT;
  plan_id_input TEXT;
BEGIN
  tenant_name := new.raw_user_meta_data->>'tenant_name';
  plan_id_input := new.raw_user_meta_data->>'plan_id'; -- Can be plan_id or combo_id
  
  IF tenant_name IS NULL THEN
    RETURN new;
  END IF;

  base_slug := public.slugify(tenant_name);
  suffix := substring(md5(random()::text) from 1 for 4);
  final_slug := base_slug || '-' || suffix;

  -- 1. Create Tenant Profile
  INSERT INTO public.tenant_profiles (id, slug, name, email, phone)
  VALUES (
    new.id, 
    final_slug, 
    tenant_name,
    new.email,
    new.raw_user_meta_data->>'phone'
  ) ON CONFLICT (id) DO NOTHING; -- Handle potential replays

  -- 2. Create Wallet (if not exists)
  INSERT INTO public.wallets (tenant_id, balance)
  VALUES (new.id, 0.00)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 3. Create Subscription (if plan/combo selected)
  IF plan_id_input IS NOT NULL THEN
    -- Check if it is a combo
    IF EXISTS (SELECT 1 FROM public.combos WHERE id = plan_id_input) THEN
       INSERT INTO public.tenant_subscriptions (tenant_id, combo_id, status)
       VALUES (new.id, plan_id_input, 'active');
    -- Check if it is a plan
    ELSIF EXISTS (SELECT 1 FROM public.plans WHERE id = plan_id_input) THEN
       INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status)
       VALUES (new.id, plan_id_input, 'active');
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
