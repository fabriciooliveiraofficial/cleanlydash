-- RESTORE THIRD MISSING INVOICE (83cfd558...)
DO $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT id, customer_id, tenant_id INTO v_booking_id, v_customer_id, v_tenant_id FROM bookings LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
        INSERT INTO public.invoices (id, booking_id, customer_id, tenant_id, amount, status, due_date, issued_date)
        VALUES ('83cfd558-55db-4328-8dc0-30bc6fba0074', v_booking_id, v_customer_id, v_tenant_id, 300.00, 'draft', CURRENT_DATE + 7, CURRENT_DATE)
        ON CONFLICT (id) DO UPDATE SET status = 'draft';
    END IF;
END $$;
