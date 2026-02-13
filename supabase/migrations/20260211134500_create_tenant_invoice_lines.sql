-- Create tenant_invoice_lines table for Hybrid Invoices
CREATE TABLE IF NOT EXISTS public.tenant_invoice_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.tenant_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    service_id UUID REFERENCES public.services(id),
    booking_id UUID REFERENCES public.bookings(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenant_invoice_lines ENABLE ROW LEVEL SECURITY;

-- Policies (same as tenant_invoices)
-- We need to ensure we don't duplicate policies if they exist, but normally policies are unique by name per table.
-- Policies (same as tenant_invoices)
-- We need to ensure we don't duplicate policies if they exist, but normally policies are unique by name per table.
DROP POLICY IF EXISTS "Tenant members can manage invoice lines" ON public.tenant_invoice_lines;
CREATE POLICY "Tenant members can manage invoice lines"
ON public.tenant_invoice_lines FOR ALL
USING (
    invoice_id IN (
        SELECT id FROM public.tenant_invoices WHERE tenant_id IN (
            SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
        )
        OR tenant_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Public can view invoice lines if invoice is accessible" ON public.tenant_invoice_lines;
CREATE POLICY "Public can view invoice lines if invoice is accessible"
ON public.tenant_invoice_lines FOR SELECT
TO anon, authenticated
USING (
    invoice_id IN (
        SELECT id FROM public.tenant_invoices -- Removed status check here to simplify, or keep if you want strict public access control
        -- Actually, for public view, we usually rely on the invoice UUID being known.
        -- But let's stick to the pattern:
        WHERE status IN ('sent', 'paid', 'cancelled')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_invoice_lines_invoice_id ON public.tenant_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invoice_lines_booking_id ON public.tenant_invoice_lines(booking_id);
