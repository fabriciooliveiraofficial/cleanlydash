-- Migration: 20240113_stripe_schema.sql
-- Purpose: Support for Platform Billing (Stripe Customers) and Tenant Commerce (Stripe Connect)

-- 1. Stripe Customers (For billing THE TENANT)
CREATE TABLE IF NOT EXISTS public.stripe_customers (
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE PRIMARY KEY,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    stripe_subscription_id TEXT, -- Active subscription ID
    link_status TEXT DEFAULT 'unlinked',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Connected Accounts (For THE TENANT to bill GUESTS)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE PRIMARY KEY,
    stripe_account_id TEXT NOT NULL UNIQUE,
    stripe_account_type TEXT DEFAULT 'standard', -- 'standard' or 'express'
    details_submitted BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tenant Invoices (Invoices created BY TENANT for Guests)
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_payment_link_id TEXT,
    stripe_invoice_id TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'draft', -- draft, open, paid, void, uncollectible
    customer_email TEXT,
    customer_name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Stripe Customers: Only Tenant Owners or Super Admins can view
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own stripe customer" ON public.stripe_customers
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Super Admins can view all stripe customers" ON public.stripe_customers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- Connected Accounts: Only Tenant Owners can manage
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own connect account" ON public.connected_accounts
    FOR ALL USING (auth.uid() = tenant_id);

CREATE POLICY "Super Admins view connect accounts" ON public.connected_accounts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- Tenant Invoices: Tenant Staff/Owners can manage
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage invoices" ON public.tenant_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE user_id = auth.uid() 
            AND tenant_id = public.tenant_invoices.tenant_id
        )
        OR
        public.tenant_invoices.tenant_id = auth.uid() -- Owner
    );

-- Indexes
CREATE INDEX idx_stripe_customers_stripe_id ON public.stripe_customers(stripe_customer_id);
CREATE INDEX idx_connected_accounts_stripe_id ON public.connected_accounts(stripe_account_id);
