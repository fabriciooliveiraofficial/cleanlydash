-- Add category column to services table
-- This allows grouping services (e.g. "Deep Cleaning", "Standard Cleaning")
-- Using text to allow flexibility, similar to the "category" in tasks or just a simple string for now.
-- If we wanted strict relation to task_categories, we could use UUID, but user prompt implies flexible "Category created by user".
-- Let's stick to text for flexibility or reuse task_categories if strictly implied.
-- The user said: "(Deep Cleaning, Standard Cleaning, Turnover etc, ou qualquer outra categoria criada pelo usuário)"
-- Since we already have `task_categories` table (from 015_task_categories.sql), let's link to it for consistency if possible, 
-- or just use a text field if the user wants free-form.
-- For a robust system, let's add `category_id` referencing `task_categories`.

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- 2. Refresh schema cache
NOTIFY pgrst, 'reload config';
