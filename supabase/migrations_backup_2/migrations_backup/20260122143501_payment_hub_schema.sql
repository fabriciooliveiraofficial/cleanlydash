-- 1. Update tenant_profiles and tenants with manual payment fields
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

-- 2. Update the sync trigger to handle new fields
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

-- 3. Update bookings for payment preferences and invoice tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method_preference TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'draft';

-- 4. Create Invoices table
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

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Invoices
CREATE POLICY "Tenant members can view invoices"
ON public.invoices FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR tenant_id = auth.uid()
);

CREATE POLICY "Tenant members can manage invoices"
ON public.invoices FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR tenant_id = auth.uid()
);

-- 6. Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
