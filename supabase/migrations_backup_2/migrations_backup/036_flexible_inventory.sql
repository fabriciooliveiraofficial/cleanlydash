-- 1. SERVICE INVENTORY (Defaults per service)
CREATE TABLE IF NOT EXISTS public.service_inventory (
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) DEFAULT 1,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    PRIMARY KEY (service_id, item_id)
);

-- 2. BOOKING INVENTORY (Overrides per specific booking)
CREATE TABLE IF NOT EXISTS public.booking_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) DEFAULT 1,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, item_id)
);

-- 3. ENABLE RLS
ALTER TABLE public.service_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_inventory ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES
DROP POLICY IF EXISTS "Owners can manage service_inventory" ON public.service_inventory;
CREATE POLICY "Owners can manage service_inventory" ON public.service_inventory 
USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Owners can manage booking_inventory" ON public.booking_inventory;
CREATE POLICY "Owners can manage booking_inventory" ON public.booking_inventory 
USING (auth.uid() = tenant_id);

-- 5. Helper Index
CREATE INDEX IF NOT EXISTS idx_service_inventory_service_id ON public.service_inventory(service_id);
CREATE INDEX IF NOT EXISTS idx_booking_inventory_booking_id ON public.booking_inventory(booking_id);
