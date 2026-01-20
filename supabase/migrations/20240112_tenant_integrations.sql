-- Tenant Integrations (Stripe Connect & Others)
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Stripe Connect
    stripe_account_id TEXT, -- acct_123456789 (The Connected Account)
    stripe_status TEXT DEFAULT 'disconnected', -- disconnected, pending, active, restricted
    stripe_details JSONB DEFAULT '{}'::jsonb, -- { "charges_enabled": true, "payouts_enabled": true }
    stripe_connected_at TIMESTAMPTZ,

    -- Future Integrations (Placeholders)
    openai_config JSONB DEFAULT '{}'::jsonb, 
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Security
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Tenants can view their own status
CREATE POLICY "Tenants view own integrations" ON public.tenant_integrations
FOR SELECT USING (tenant_id = auth.uid());

-- 2. Super Admins can view/manage all (to help debug)
CREATE POLICY "Super Admin manage integrations" ON public.tenant_integrations
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 3. Tenants CANNOT insert manual IDs (Security risk). 
-- This table should be populated by the Backend (Edge Function) after OAuth callback.
-- However, for Development/Testing, we might allow insert if needed, but best practice is read-only for tenant on crucial columns.
-- We will allow 'UPDATE' on 'openai_config' if we want them to bring their own key (optional), but User said we resell.
-- So effectively, this table is Read-Only for the tenant, populated by System.
