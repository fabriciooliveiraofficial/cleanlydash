-- Migration 021: Advanced RBAC Permission System
-- Implements custom roles and granular permissions

-- 1. Create table for Custom Roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission strings e.g. ["finance.view", "team.manage"]
  is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add role_id to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.custom_roles(id);

-- 3. RLS for custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Tenants can manage their own roles
-- Tenants can manage their own roles
DROP POLICY IF EXISTS "Tenants manage their custom roles" ON public.custom_roles;
CREATE POLICY "Tenants manage their custom roles" ON public.custom_roles
FOR ALL USING (tenant_id = auth.uid());

-- Users can read roles (to see their own permissions or others if authorized)
-- For now, let's allow read access to members of the tenant
DROP POLICY IF EXISTS "Members can read tenant roles" ON public.custom_roles;
CREATE POLICY "Members can read tenant roles" ON public.custom_roles
FOR SELECT USING (
    tenant_id IN (
        SELECT tenant_id FROM public.team_members WHERE user_id = auth.uid()
    )
    OR tenant_id = auth.uid()
);

-- 4. Initial Seed Function (Optional, can be run manually or via app logic)
-- We will create a function to seed default roles for a new tenant
CREATE OR REPLACE FUNCTION public.seed_default_roles(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    staff_role_id UUID;
    cleaner_role_id UUID;
BEGIN
    -- Super Admin (Full Access)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system)
    VALUES (target_tenant_id, 'Super Admin', 'Full access to all system features', 
        '["finance.view_balance", "finance.manage_funds", "payroll.view", "payroll.manage", "team.view", "team.manage", "customers.view", "customers.manage", "tasks.view", "tasks.manage_all", "settings.view", "settings.manage"]'::jsonb, true)
    RETURNING id INTO admin_role_id;

    -- Manager (Operations & Team, No Finance)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system)
    VALUES (target_tenant_id, 'Manager', 'Manages team and operations', 
        '["team.view", "team.manage", "customers.view", "customers.manage", "tasks.view", "tasks.manage_all", "settings.view"]'::jsonb, true)
    RETURNING id INTO manager_role_id;

    -- Staff (Standard Access)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system)
    VALUES (target_tenant_id, 'Staff', 'Standard operational access', 
        '["team.view", "customers.view", "tasks.view"]'::jsonb, true)
    RETURNING id INTO staff_role_id;

    -- Cleaner (Minimal Access)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system)
    VALUES (target_tenant_id, 'Cleaner', 'Task view only', 
        '["tasks.view"]'::jsonb, true)
    RETURNING id INTO cleaner_role_id;

    -- Note: We are purposely NOT migrating existing users automatically here because logic might be complex.
    -- The app should handle migration when the Tenant opens the "Roles" settings page for the first time.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
