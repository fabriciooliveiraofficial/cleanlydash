-- Fix for RLS Permission in tenant_notification_settings
-- This migration updates the policy to use the correct table names (tenant_profiles and team_members)

DROP POLICY IF EXISTS "Tenants can manage their own notification settings" ON public.tenant_notification_settings;

CREATE POLICY "Tenants can manage their own notification settings" ON public.tenant_notification_settings
    FOR ALL USING (
        tenant_id = auth.uid() -- For owners (id in tenant_profiles)
        OR 
        tenant_id IN (SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()) -- For staff
    );

-- Also ensure history and push_subscriptions are robust
-- push_subscriptions already uses simple auth.uid() = user_id (correct)

-- notification_history RLS fix
DROP POLICY IF EXISTS "Users can view their own history" ON public.notification_history;
CREATE POLICY "Users can view their own history" ON public.notification_history
    FOR ALL USING (auth.uid() = user_id);
