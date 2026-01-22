-- FIX: Add missing customer_id relation to invoices
-- This resolves the "Could not find a relationship" error

-- 1. Add column if not exists
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- 2. Backfill existing invoices using data from bookings
UPDATE public.invoices
SET customer_id = bookings.customer_id
FROM public.bookings
WHERE public.invoices.booking_id = bookings.id
AND public.invoices.customer_id IS NULL;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload config';
