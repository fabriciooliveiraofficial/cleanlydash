-- 1. Ensure the column exists (This DDL statement forces Supabase to refresh schema cache)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS type inventory_type NOT NULL DEFAULT 'consumable';

-- 2. Ensure other columns exist just in case
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS warning_level INTEGER DEFAULT 1;

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS unit inventory_unit NOT NULL DEFAULT 'count';

-- 3. Explicitly reload configuration
NOTIFY pgrst, 'reload config';

-- 4. Verify/Re-apply Policies (just to be safe and trigger more DDL)
DROP POLICY IF EXISTS "Owners can manage own inventory_items" ON public.inventory_items;
CREATE POLICY "Owners can manage own inventory_items" ON public.inventory_items USING (auth.uid() = tenant_id);
