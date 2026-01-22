-- Fix Bookings Schema: Add missing columns and refresh cache
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_internal TEXT;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_client TEXT;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_staff TEXT;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_exception BOOLEAN DEFAULT FALSE;

-- Notification Preferences
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notify_client TEXT DEFAULT 'none';

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notify_staff TEXT DEFAULT 'none';

-- Ensure status has a default if not present (to avoid null issues)
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
