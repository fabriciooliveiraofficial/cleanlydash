-- 1. Modify existing plans table to support new requirements
-- Existing columns: id (text), type (text), name (text), price_monthly_usd (numeric), currency (text), features (jsonb), limits (jsonb)
-- New columns needed: description, highlighted, badge, category, active, display_order

-- 0. Helper function for policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS highlighted boolean DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS category text; -- Removed CHECK for now
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Backfill removed to avoid update errors
-- UPDATE public.plans SET category = type WHERE category IS NULL;

-- 2. Create plan_features table (Normalized features)
-- LINK TO plans(id) WHICH IS TEXT, NOT UUID
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id text REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  included boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Plans Policies (Adjusting for public access)
DROP POLICY IF EXISTS "Public plans are viewable by everyone" ON public.plans;
CREATE POLICY "Public plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
CREATE POLICY "Admins can insert plans" ON public.plans FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;
CREATE POLICY "Admins can update plans" ON public.plans FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete plans" ON public.plans;
CREATE POLICY "Admins can delete plans" ON public.plans FOR DELETE USING (public.is_admin());

-- Plan Features Policies
DROP POLICY IF EXISTS "Public plan_features are viewable by everyone" ON public.plan_features;
CREATE POLICY "Public plan_features are viewable by everyone" ON public.plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert plan_features" ON public.plan_features;
CREATE POLICY "Admins can insert plan_features" ON public.plan_features FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update plan_features" ON public.plan_features;
CREATE POLICY "Admins can update plan_features" ON public.plan_features FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete plan_features" ON public.plan_features;
CREATE POLICY "Admins can delete plan_features" ON public.plan_features FOR DELETE USING (public.is_admin());

-- 4. Sync Seed Data (Update existing plans with new fields)
-- Using IDs from 20260129 refinement
UPDATE public.plans SET 
    description = 'For independent hosts.', 
    badge = 'Essentials System', 
    highlighted = false, 
    display_order = 1 
WHERE id = 'solopreneur_combo';

UPDATE public.plans SET 
    description = 'Limited launch offer.', 
    badge = 'Everything in Solopreneur', 
    highlighted = true, 
    display_order = 2 
WHERE id = 'founders_combo';

UPDATE public.plans SET 
    description = 'For small teams.', 
    badge = 'Business System', 
    highlighted = false, 
    display_order = 3 
WHERE id = 'growth_team_combo';

UPDATE public.plans SET 
    description = 'Efficient basic management.', 
    badge = 'Up to 2 Users', 
    highlighted = false, 
    display_order = 4 
WHERE id = 'system_essentials';

UPDATE public.plans SET 
    description = 'Full management with HR.', 
    badge = 'Popular', 
    highlighted = false, 
    display_order = 5 
WHERE id = 'system_business';

UPDATE public.plans SET 
    description = 'Business line only.', 
    badge = '1 User', 
    highlighted = false, 
    display_order = 6 
WHERE id = 'voice_starter';

UPDATE public.plans SET 
    description = 'Moderate volume.', 
    badge = '3 Users', 
    highlighted = false, 
    display_order = 7 
WHERE id = 'voice_pro';

UPDATE public.plans SET 
    description = 'High volume.', 
    badge = '5 Users', 
    highlighted = false, 
    display_order = 8 
WHERE id = 'voice_sale' OR id = 'voice_scale';

-- 5. Migrate JSONB features to plan_features table (One-time shim)
-- This assumes features contains a JSON array of strings
INSERT INTO public.plan_features (plan_id, text, display_order)
SELECT 
    p.id, 
    f.value, 
    f.ordinality
FROM 
    public.plans p, 
    jsonb_array_elements_text(p.features) WITH ORDINALITY f(value, ordinality)
WHERE 
    NOT EXISTS (SELECT 1 FROM public.plan_features WHERE plan_id = p.id);
