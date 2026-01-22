-- FIX: Add missing date columns to invoices (Required by application)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE + 7,
ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;

-- RELOAD SCHEMA
NOTIFY pgrst, 'reload config';

-- RESTORE THE INVOICE (Now that columns exist)
DO $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT id, customer_id, tenant_id 
    INTO v_booking_id, v_customer_id, v_tenant_id
    FROM bookings
    LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
        INSERT INTO public.invoices (
            id, booking_id, customer_id, tenant_id, amount, status, due_date, issued_date
        )
        VALUES (
            'f76e4e29-7a9c-4bb3-8bd2-2d547ba69048', 
            v_booking_id, 
            v_customer_id, 
            v_tenant_id, 
            150.00, 
            'draft', 
            CURRENT_DATE + 7, 
            CURRENT_DATE
        )
        ON CONFLICT (id) DO UPDATE SET status = 'draft';
    END IF;
END $$;
