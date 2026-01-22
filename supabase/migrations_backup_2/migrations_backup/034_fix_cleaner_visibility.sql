-- Migration 034: Fix Cleaner Visibility
-- Allows cleaners to see customer and service details for bookings they are assigned to, 
-- even if they don't have a profile entry.

-- 1. Allow SELECT on 'public.customers' for assigned users
DROP POLICY IF EXISTS "Cleaners can view their customers" ON public.customers;
CREATE POLICY "Cleaners can view their customers"
ON public.customers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.customer_id = public.customers.id
        AND b.assigned_to = auth.uid()
    )
);

-- 2. Allow SELECT on 'public.services' for assigned users
DROP POLICY IF EXISTS "Cleaners can view their services" ON public.services;
CREATE POLICY "Cleaners can view their services"
ON public.services FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.service_id = public.services.id
        AND b.assigned_to = auth.uid()
    )
);

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload config';
