-- Migration 20240114_flexible_roles.sql
-- Purpose: Enable flexible role configuration by adding app_access control to custom_roles

-- 1. Ensure 'cleaner' exists in app_role enum
-- Postgres doesn't support "ADD VALUE IF NOT EXISTS" directly in all versions, 
-- but we can wrap it in an exception block or checks.
DO $$
BEGIN
    ALTER TYPE public.app_role ADD VALUE 'cleaner';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add app_access column to custom_roles
-- This controls whether a role grants access to the Dashboard or the Cleaner App
ALTER TABLE public.custom_roles
ADD COLUMN IF NOT EXISTS app_access TEXT DEFAULT 'dashboard'
CHECK (app_access IN ('dashboard', 'cleaner_app'));

-- 3. Backfill existing roles based on name heuristics
-- If the role name implies "Cleaner", give it Cleaner App access
UPDATE public.custom_roles
SET app_access = 'cleaner_app'
WHERE name ILIKE '%cleaner%' 
   OR name ILIKE '%faxin%' 
   OR name ILIKE '%limpez%';

-- 4. Update the seed_default_roles function to include app_access
CREATE OR REPLACE FUNCTION public.seed_default_roles(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    staff_role_id UUID;
    cleaner_role_id UUID;
BEGIN
    -- Super Admin (Full Access)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system, app_access)
    VALUES (target_tenant_id, 'Super Admin', 'Full access to all system features', 
        '["finance.view_balance", "finance.manage_funds", "payroll.view", "payroll.manage", "team.view", "team.manage", "customers.view", "customers.manage", "tasks.view", "tasks.manage_all", "settings.view", "settings.manage"]'::jsonb, true, 'dashboard')
    RETURNING id INTO admin_role_id;

    -- Manager (Operations & Team, No Finance)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system, app_access)
    VALUES (target_tenant_id, 'Manager', 'Manages team and operations', 
        '["team.view", "team.manage", "customers.view", "customers.manage", "tasks.view", "tasks.manage_all", "settings.view"]'::jsonb, true, 'dashboard')
    RETURNING id INTO manager_role_id;

    -- Staff (Standard Access)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system, app_access)
    VALUES (target_tenant_id, 'Staff', 'Standard operational access', 
        '["team.view", "customers.view", "tasks.view"]'::jsonb, true, 'dashboard')
    RETURNING id INTO staff_role_id;

    -- Cleaner (Minimal Access, Cleaner App)
    INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system, app_access)
    VALUES (target_tenant_id, 'Cleaner', 'Task view only', 
        '["tasks.view"]'::jsonb, true, 'cleaner_app')
    RETURNING id INTO cleaner_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
