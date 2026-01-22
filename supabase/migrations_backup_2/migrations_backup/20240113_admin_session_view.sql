-- Migration: 20240113_admin_session_view.sql
-- Purpose: Consolidate active sessions with Tenant context for Super Admin monitoring

CREATE OR REPLACE VIEW public.admin_active_sessions_view AS
SELECT 
    s.id as session_row_id,
    s.user_id,
    s.session_id,
    s.device_fingerprint,
    s.last_active_at,
    -- Determine Tenant ID
    COALESCE(tm.tenant_id, tp.id) as tenant_id,
    -- Determine Tenant Name
    COALESCE(tp_via_member.name, tp.name) as tenant_name,
    -- User Role info
    COALESCE(tm.role::text, 'owner') as user_role,
    COALESCE(tm.email, auth_u.email) as user_email
FROM public.active_sessions s
LEFT JOIN auth.users auth_u ON auth_u.id = s.user_id
-- Join for STAFF (via team_members)
LEFT JOIN public.team_members tm ON tm.user_id = s.user_id
LEFT JOIN public.tenant_profiles tp_via_member ON tp_via_member.id = tm.tenant_id
-- Join for OWNERS (via tenant_profiles direct match)
LEFT JOIN public.tenant_profiles tp ON tp.id = s.user_id
WHERE 
    -- Only include if we found a tenant link (Active Sessions for users without tenant are possible? maybe system admins?)
    (tm.tenant_id IS NOT NULL OR tp.id IS NOT NULL);

-- Grant Access to Super Admin
-- Note: Views leverage RLS of underlying tables usually, but active_sessions has RLS.
-- This view should be SECURITY DEFINER or accessible to super_admin.
-- We can just rely on the RLS we added in `20240113_fix_global_traffic.sql` which allows super_admin to SELECT active_sessions.
-- But `team_members` and `tenant_profiles` also have RLS.

-- Ideally, Super Admin bypasses RLS.
-- Since we are querying from frontend, we are subject to RLS.
-- We must ensure Super Admin RLS policies exist on ALL these tables.

-- RLS Check:
-- active_sessions: Done (super_admin can view all)
-- tenant_profiles: Public can view (Done in 20240109)
-- team_members: "Tenant manages..." only. 
-- WE NEED TO ADD SUPER ADMIN POLICY FOR team_members!

DROP POLICY IF EXISTS "Super Admins can view all team members" ON public.team_members;
CREATE POLICY "Super Admins can view all team members"
    ON public.team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );
