-- Migration: Add customer_id to job_evidence
-- Description: Allows associating documents/evidence directly with a customer, independent of a specific booking.

ALTER TABLE public.job_evidence ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- Update RLS if needed (assuming tenant_id is already handling isolation)
-- If we want to strictly allow access if either booking.customer_id matches OR evidence.customer_id matches:
-- For now, tenant isolation usually suffices, but adding specific checks is better.

CREATE INDEX IF NOT EXISTS idx_job_evidence_customer_id ON public.job_evidence(customer_id);
