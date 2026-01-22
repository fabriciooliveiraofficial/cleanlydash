-- RESTORE MISSING INVOICE
-- The invoice ID f76e4e29-7a9c-4bb3-8bd2-2d547ba69048 is missing (likely deleted during table recreate).
-- This script creates it and links it to an existing booking so the link works.

DO $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_tenant_id UUID;
    v_price DECIMAL;
BEGIN
    -- 1. Find a valid booking to attach this invoice to
    SELECT id, customer_id, tenant_id, price 
    INTO v_booking_id, v_customer_id, v_tenant_id, v_price
    FROM bookings
    LIMIT 1;

    -- 2. Insert the invoice if we found a booking
    IF v_booking_id IS NOT NULL THEN
        INSERT INTO public.invoices (
            id, 
            booking_id, 
            customer_id, 
            tenant_id, 
            amount, 
            status, 
            due_date, 
            issued_date
        )
        VALUES (
            'f76e4e29-7a9c-4bb3-8bd2-2d547ba69048', -- The ID from your link
            v_booking_id,
            v_customer_id,
            v_tenant_id,
            COALESCE(v_price, 150.00),
            'draft', -- 'draft' is now visible
            CURRENT_DATE + 7,
            CURRENT_DATE
        )
        ON CONFLICT (id) DO UPDATE SET
            status = 'draft'; -- Ensure it's visible if it already existed but was hidden
            
        RAISE NOTICE 'Invoice f76e4e29-7a9c-4bb3-8bd2-2d547ba69048 restored successfully.';
    ELSE
        RAISE WARNING 'No bookings found in database. Cannot create invoice.';
    END IF;
END $$;
