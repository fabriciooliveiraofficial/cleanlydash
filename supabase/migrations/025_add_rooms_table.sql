-- Migration: Add Rooms table and link to tasks
-- Description: Creates the 'rooms' table for property area management and adds 'room_id' to 'tasks'.

-- 1. Create Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy
DROP POLICY IF EXISTS "Users can manage own rooms" ON public.rooms;
CREATE POLICY "Users can manage own rooms" ON public.rooms 
    USING (auth.uid() = tenant_id)
    WITH CHECK (auth.uid() = tenant_id);

-- 4. Add room_id to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload config';
