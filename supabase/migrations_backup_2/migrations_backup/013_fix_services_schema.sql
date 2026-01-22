-- Migration to fix missing category_id column and refresh schema cache
-- Run this in the Supabase SQL Editor if the column is still missing.

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- 2. Refresh schema cache
NOTIFY pgrst, 'reload config';
