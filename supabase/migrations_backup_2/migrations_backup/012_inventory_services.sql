-- 1. Create ENUMs (Idempotent)
DO $$ BEGIN
    CREATE TYPE inventory_type AS ENUM ('consumable', 'asset');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inventory_unit AS ENUM ('count', 'roll', 'bottle', 'box', 'set');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_action_type AS ENUM ('consume', 'check', 'install');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. INVENTORY ITEMS (Global Definition of Items)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    type inventory_type NOT NULL DEFAULT 'consumable',
    unit inventory_unit NOT NULL DEFAULT 'count',
    warning_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVICES (The "Menu")
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_default NUMERIC(10,2) DEFAULT 0.00,
    duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASKS (The "Lego Blocks")
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SERVICE DEFINITION
CREATE TABLE IF NOT EXISTS public.service_def_tasks (
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT true,
    PRIMARY KEY (service_id, task_id)
);

-- 6. TASK REQUIREMENTS
CREATE TABLE IF NOT EXISTS public.task_inventory_requirements (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_needed NUMERIC(10,2) DEFAULT 1,
    action_type task_action_type DEFAULT 'consume',
    PRIMARY KEY (task_id, item_id)
);

-- 7. PROPERTY INVENTORY
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_inventory (
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) DEFAULT 0,
    target_quantity NUMERIC(10,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (property_id, item_id)
);

-- 8. ENABLE RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_def_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_inventory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inventory ENABLE ROW LEVEL SECURITY;

-- 9. CREATE POLICIES (Idempotent)
DROP POLICY IF EXISTS "Owners can manage own inventory_items" ON public.inventory_items;
CREATE POLICY "Owners can manage own inventory_items" ON public.inventory_items USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Owners can manage own services" ON public.services;
CREATE POLICY "Owners can manage own services" ON public.services USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Owners can manage own tasks" ON public.tasks;
CREATE POLICY "Owners can manage own tasks" ON public.tasks USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Owners can manage service_def_tasks" ON public.service_def_tasks;
CREATE POLICY "Owners can manage service_def_tasks" ON public.service_def_tasks 
USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.tenant_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage task_inventory_requirements" ON public.task_inventory_requirements;
CREATE POLICY "Owners can manage task_inventory_requirements" ON public.task_inventory_requirements
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.tenant_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage properties" ON public.properties;
CREATE POLICY "Owners can manage properties" ON public.properties USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Owners can manage property_inventory" ON public.property_inventory;
CREATE POLICY "Owners can manage property_inventory" ON public.property_inventory
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.tenant_id = auth.uid()));
