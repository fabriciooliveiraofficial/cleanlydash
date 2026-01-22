-- 1. ADDONS (The Catalog of Extras)
CREATE TABLE IF NOT EXISTS public.addons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) DEFAULT 0.00,
    category TEXT DEFAULT 'general', -- e.g., 'cleaning', 'laundry', 'extra'
    is_standalone BOOLEAN DEFAULT true, -- If true, can be added without specific service restrictions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- 2. SERVICE ADDONS (Linking Addons to Specific Services)
-- If an addon is linked here, it shows up as a "Recommended Upsell" for that service.
CREATE TABLE IF NOT EXISTS public.service_addons (
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES public.addons(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, addon_id)
);

-- 3. BOOKING ADDONS (Persistence of Sold Addons)
CREATE TABLE IF NOT EXISTS public.booking_addons (
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES public.addons(id) ON DELETE RESTRICT, -- Prevent deleting addon if used in booking? Or cascade? RESTRICT is safer for history.
    price_at_time NUMERIC(10,2) NOT NULL, -- Snapshot of price at purchase
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (booking_id, addon_id)
);

-- 4. ENABLE RLS
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES
-- Addons
DROP POLICY IF EXISTS "Owners can manage own addons" ON public.addons;
CREATE POLICY "Owners can manage own addons" ON public.addons USING (auth.uid() = tenant_id);

-- Service Addons
DROP POLICY IF EXISTS "Owners can manage service_addons" ON public.service_addons;
CREATE POLICY "Owners can manage service_addons" ON public.service_addons 
USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.tenant_id = auth.uid()));

-- Booking Addons
DROP POLICY IF EXISTS "Owners can manage booking_addons" ON public.booking_addons;
CREATE POLICY "Owners can manage booking_addons" ON public.booking_addons
USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.tenant_id = auth.uid()));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
