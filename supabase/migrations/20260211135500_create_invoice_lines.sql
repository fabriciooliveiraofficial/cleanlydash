-- Create invoice_lines table for Hybrid Invoices (linked to main invoices table)
CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    service_id UUID REFERENCES public.services(id),
    booking_id UUID REFERENCES public.bookings(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Tenant members can manage invoice lines" ON public.invoice_lines;
CREATE POLICY "Tenant members can manage invoice lines"
ON public.invoice_lines FOR ALL
USING (
    invoice_id IN (
        SELECT id FROM public.invoices WHERE tenant_id IN (
            SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
        )
        OR tenant_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Public can view invoice lines if invoice is accessible" ON public.invoice_lines;
CREATE POLICY "Public can view invoice lines if invoice is accessible"
ON public.invoice_lines FOR SELECT
TO anon, authenticated
USING (
    invoice_id IN (
        SELECT id FROM public.invoices WHERE status IN ('sent', 'paid', 'cancelled')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_booking_id ON public.invoice_lines(booking_id);
