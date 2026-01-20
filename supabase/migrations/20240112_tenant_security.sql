-- Security Updates (Tenant Access)

-- 1. Update Audit Logs Policies
-- Allow tenants to view their own history
DROP POLICY IF EXISTS "Tenants view own audit logs" ON public.audit_logs;
CREATE POLICY "Tenants view own audit logs"
ON public.audit_logs FOR SELECT
USING (
  actor_id = auth.uid()
);

-- Allow tenants to log their own actions (e.g. Changed Password, Enabled MFA)
DROP POLICY IF EXISTS "Tenants insert own audit logs" ON public.audit_logs;
CREATE POLICY "Tenants insert own audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
);

-- 2. Function to log security events (Optional helper, but direct insert works)
