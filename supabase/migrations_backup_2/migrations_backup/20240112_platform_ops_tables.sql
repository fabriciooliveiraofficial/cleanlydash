-- 1. Audit Logs for Platform Operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id), -- Identify who did it
    action TEXT NOT NULL, -- e.g. 'MANUAL_CREDIT_GRANT', 'SUSPEND_TENANT'
    target_resource TEXT NOT NULL, -- e.g. 'tenant:slug-123'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only Super Admin can view all. Service role can insert.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin view audit logs" ON public.audit_logs;
CREATE POLICY "Super Admin view audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 2. Wallet Transactions (Linked to Wallets from 20240111)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Tenants view their own. Admins view all.
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants view own transactions" ON public.wallet_transactions;
CREATE POLICY "Tenants view own transactions"
ON public.wallet_transactions FOR SELECT
USING (
   EXISTS (
      SELECT 1 FROM public.wallets w 
      WHERE w.id = wallet_id 
      AND w.tenant_id = auth.uid()
   )
);

DROP POLICY IF EXISTS "Super Admin view all transactions" ON public.wallet_transactions;
CREATE POLICY "Super Admin view all transactions"
ON public.wallet_transactions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 3. Additional Admin Policies (Crucial for Dashboard Actions)

-- Allow Admin to Update Subscriptions (Suspend/Activate)
DROP POLICY IF EXISTS "Super Admin update subscriptions" ON public.tenant_subscriptions;
CREATE POLICY "Super Admin update subscriptions"
ON public.tenant_subscriptions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Allow Admin to Delete Tenant Profiles (Hard Delete)
DROP POLICY IF EXISTS "Super Admin delete tenant profiles" ON public.tenant_profiles;
CREATE POLICY "Super Admin delete tenant profiles"
ON public.tenant_profiles FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);


-- 4. RPC: Grant Credit (Manual Adjustment)
CREATE OR REPLACE FUNCTION public.admin_grant_credit(
    target_slug TEXT, 
    credit_amount NUMERIC(10, 2), 
    reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_tenant_id UUID;
  target_wallet_id UUID;
  admin_id UUID;
BEGIN
  admin_id := auth.uid();

  -- Verify Admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id AND role = 'super_admin') THEN
     RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Find Tenant
  SELECT id INTO target_tenant_id FROM public.tenant_profiles WHERE slug = target_slug;
  IF target_tenant_id IS NULL THEN
     RETURN json_build_object('success', false, 'error', 'Tenant Not Found');
  END IF;

  -- Find Wallet
  SELECT id INTO target_wallet_id FROM public.wallets WHERE tenant_id = target_tenant_id;
  IF target_wallet_id IS NULL THEN
     RETURN json_build_object('success', false, 'error', 'Tenant has no wallet configured');
  END IF;

  -- Update Balance
  UPDATE public.wallets 
  SET balance = balance + credit_amount 
  WHERE id = target_wallet_id;

  -- Log Transaction
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, description, metadata)
  VALUES (
      target_wallet_id, 
      credit_amount, 
      'credit', 
      'Manual Adjustment: ' || reason,
      json_build_object('admin_id', admin_id)
  );

  -- Log Audit
  INSERT INTO public.audit_logs (actor_id, action, target_resource, details)
  VALUES (
      admin_id, 
      'MANUAL_CREDIT_GRANT', 
      'tenant:' || target_slug, 
      json_build_object('amount', credit_amount, 'reason', reason)
  );

  RETURN json_build_object('success', true, 'new_balance', (SELECT balance FROM public.wallets WHERE id = target_wallet_id));
END;
$$;
