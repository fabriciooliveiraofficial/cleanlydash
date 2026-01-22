-- Phase 1: Advanced Booking Fields
-- service_id, assigned_to, color, multi-audience notes

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';

-- Multi-Audience Notes
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_internal TEXT;  -- Owner/Admin only

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_client TEXT;    -- Visible to client

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notes_staff TEXT;     -- Visible to assigned staff only

-- Recurrence Fields (for Phase 3, but adding now to avoid future migration)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;  -- RRULE format e.g. FREQ=WEEKLY;BYDAY=MO

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_exception BOOLEAN DEFAULT FALSE;

-- Index for faster recurrence queries
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON public.bookings(parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned ON public.bookings(assigned_to);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
