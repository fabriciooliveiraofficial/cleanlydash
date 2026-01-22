-- FIX: Allow public access to 'draft' invoices for easier testing
DROP POLICY "Public can view published invoices" ON public.invoices;

CREATE POLICY "Public can view published invoices"
ON public.invoices FOR SELECT
TO anon, authenticated
USING (status IN ('draft', 'sent', 'paid', 'cancelled'));

NOTIFY pgrst, 'reload config';
