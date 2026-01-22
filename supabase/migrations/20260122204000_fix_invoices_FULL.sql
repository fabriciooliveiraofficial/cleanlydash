-- COMPREHENSIVE FIX SCRIPT for Invoices and Payment Hub
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. Ensure `tenant_profiles` and `tenants` have payment columns
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS zelle_id TEXT,
ADD COLUMN IF NOT EXISTS venmo_id TEXT,
ADD COLUMN IF NOT EXISTS check_instructions TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS zelle_id TEXT,
ADD COLUMN IF NOT EXISTS venmo_id TEXT,
ADD COLUMN IF NOT EXISTS check_instructions TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Update Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_tenant_profiles_to_tenants()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenants (id, name, slug, logo_url, zelle_id, venmo_id, check_instructions, phone, address)
    VALUES (new.id, new.name, new.slug, new.logo_url, new.zelle_id, new.venmo_id, new.check_instructions, new.phone, new.address)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        logo_url = EXCLUDED.logo_url,
        zelle_id = EXCLUDED.zelle_id,
        venmo_id = EXCLUDED.venmo_id,
        check_instructions = EXCLUDED.check_instructions,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update bookings for payment preferences
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method_preference TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'draft';

-- 4. Create Invoices table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    status TEXT DEFAULT 'draft', -- draft, sent, paid, cancelled
    checklist_snapshot JSONB DEFAULT '{}'::jsonb,
    payment_link_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Security Policies (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean stale
DROP POLICY IF EXISTS "Tenant members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenant members can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public can view published invoices" ON public.invoices;

-- Team Policy (Internal)
CREATE POLICY "Tenant members can manage invoices"
ON public.invoices FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR tenant_id = auth.uid()
);

-- Public Access Policy (External Customers)
CREATE POLICY "Public can view published invoices"
ON public.invoices FOR SELECT
TO anon, authenticated
USING (status IN ('sent', 'paid', 'cancelled'));

-- 6. Reload Cache
NOTIFY pgrst, 'reload config';
