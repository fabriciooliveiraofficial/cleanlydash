-- 1. Create Task Categories table
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'CheckSquare',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy
DROP POLICY IF EXISTS "Owners can manage own task_categories" ON public.task_categories;
CREATE POLICY "Owners can manage own task_categories" ON public.task_categories USING (auth.uid() = tenant_id);

-- 4. Extend tasks table with category, price, duration
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 15;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload config';
