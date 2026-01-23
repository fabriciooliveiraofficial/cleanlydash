-- Add service support to tenant_invoices
ALTER TABLE public.tenant_invoices 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id),
ADD COLUMN IF NOT EXISTS checklist_snapshot JSONB DEFAULT '[]'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.tenant_invoices.service_id IS 'Link to the service if this payment link is for a specific service';
COMMENT ON COLUMN public.tenant_invoices.checklist_snapshot IS 'Snapshot of the service checklist at the time the link was generated';
