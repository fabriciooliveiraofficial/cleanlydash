-- Enable public access to invoices so customers can view/pay them
-- RESTRICTION: Only 'sent', 'paid', or 'cancelled' invoices (not drafts)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'invoices' 
        AND policyname = 'Public can view published invoices'
    ) THEN
        CREATE POLICY "Public can view published invoices"
        ON public.invoices FOR SELECT
        TO anon, authenticated
        USING (status IN ('sent', 'paid', 'cancelled'));
    END IF;
END $$;
