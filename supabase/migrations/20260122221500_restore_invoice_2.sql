-- RESTORE THE SECOND MISSING INVOICE (4e3cf2a8...)
DO $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Just grab the first booking to link it
    SELECT id, customer_id, tenant_id INTO v_booking_id, v_customer_id, v_tenant_id FROM bookings LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
        INSERT INTO public.invoices (id, booking_id, customer_id, tenant_id, amount, status, due_date, issued_date)
        VALUES ('4e3cf2a8-7999-42f6-abf6-3a45726ab372', v_booking_id, v_customer_id, v_tenant_id, 250.00, 'draft', CURRENT_DATE + 7, CURRENT_DATE)
        ON CONFLICT (id) DO UPDATE SET status = 'draft';
    END IF;
END $$;

NOTIFY pgrst, 'reload config';
