-- Enable public access to invoices so customers can view/pay them
-- RESTRICTION: Only 'sent', 'paid', or 'cancelled' invoices (not drafts)

CREATE POLICY "Public can view published invoices"
ON public.invoices FOR SELECT
TO anon, authenticated
USING (status IN ('sent', 'paid', 'cancelled'));
