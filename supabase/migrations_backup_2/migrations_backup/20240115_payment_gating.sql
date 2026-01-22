-- Migration: 20240115_payment_gating.sql
-- Purpose: Update handle_new_tenant to set 'payment_pending' for paid plans.

CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
DECLARE
  tenant_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  suffix TEXT;
  plan_id_input TEXT;
  plan_price NUMERIC(10, 2);
  initial_status TEXT := 'active'; -- Default to active (for free plans)
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
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Create Wallet (if not exists)
  INSERT INTO public.wallets (tenant_id, balance)
  VALUES (new.id, 0.00)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 3. Determine Subscription Status based on Price
  IF plan_id_input IS NOT NULL THEN
     -- Check Combo Price
     SELECT price_monthly_usd INTO plan_price FROM public.combos WHERE id = plan_id_input;
     
     -- If not found in combos, check Plans
     IF plan_price IS NULL THEN
        SELECT price_monthly_usd INTO plan_price FROM public.plans WHERE id = plan_id_input;
     END IF;

     -- If price > 0, set status to payment_pending
     IF plan_price > 0 THEN
        initial_status := 'payment_pending';
     END IF;

     -- Insert Subscription
     IF EXISTS (SELECT 1 FROM public.combos WHERE id = plan_id_input) THEN
        INSERT INTO public.tenant_subscriptions (tenant_id, combo_id, status)
        VALUES (new.id, plan_id_input, initial_status);
     ELSIF EXISTS (SELECT 1 FROM public.plans WHERE id = plan_id_input) THEN
        INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status)
        VALUES (new.id, plan_id_input, initial_status);
     END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
