-- Migration: 20260130094800_create_data_imports.sql
-- Purpose: Create infrastructure for Import/Export Module (DataHub)

-- 1. Create data_imports table to track history
CREATE TABLE IF NOT EXISTS public.data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- Intentionally identifying tenant directly
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customers', 'bookings', 'properties', 'team')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')) DEFAULT 'pending',
    file_name TEXT,
    total_records INT DEFAULT 0,
    successful_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb, -- Array of error objects {row: 1, error: "Invalid email"}
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Tenants can view their own imports
CREATE POLICY "Tenants view own imports"
    ON public.data_imports
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
        OR 
        -- Fallback for direct auth.uid() if tenant_id is linked differently in this system's evolution
        -- Assuming user_roles is the source of truth for tenant linkage as seen in previous files
        EXISTS (
             SELECT 1 FROM public.tenant_profiles tp
             JOIN public.user_roles ur ON ur.user_id = auth.uid()
             WHERE tp.id = data_imports.tenant_id
        )
    );

-- Users can insert imports for their tenant
CREATE POLICY "Users insert own imports"
    ON public.data_imports
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_profiles -- Simplified check, usually derived from auth context
            WHERE id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid())
        )
    );

-- Users can update (e.g. mark as rolled_back) their own imports
CREATE POLICY "Users update own imports"
    ON public.data_imports
    FOR UPDATE
    USING (created_by = auth.uid());


-- 4. Add import_id to core tables for Rollback capability
-- Customers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'import_id') THEN
        ALTER TABLE public.customers ADD COLUMN import_id UUID REFERENCES public.data_imports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Bookings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'import_id') THEN
        ALTER TABLE public.bookings ADD COLUMN import_id UUID REFERENCES public.data_imports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Properties
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'import_id') THEN
        ALTER TABLE public.properties ADD COLUMN import_id UUID REFERENCES public.data_imports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Notify
NOTIFY pgrst, 'reload config';
