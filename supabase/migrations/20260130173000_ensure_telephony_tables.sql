-- 1. Ensure 'call_logs' table exists
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    from_number TEXT,
    to_number TEXT,
    status TEXT, -- 'ringing', 'in-progress', 'completed', 'failed'
    duration_seconds INTEGER DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    recording_url TEXT,
    external_id TEXT -- Telnyx Call Control ID
);

-- 2. Ensure 'sms_logs' table exists
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    from_number TEXT,
    to_number TEXT,
    content TEXT,
    media_urls TEXT[], -- Array of URLs for MMS
    status TEXT, -- 'sent', 'delivered', 'failed', 'received'
    cost NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    external_id TEXT -- Telnyx Message ID
);

-- 3. Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (IF NOT EXISTS is not standard for policies, so we use DO block or drop/create)
DO $$ 
BEGIN
    -- Call Logs Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Users can view own call logs') THEN
        CREATE POLICY "Users can view own call logs" ON public.call_logs FOR SELECT USING (auth.uid() = tenant_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Service role can manage call logs') THEN
        CREATE POLICY "Service role can manage call logs" ON public.call_logs USING (true) WITH CHECK (true); -- Simplified for service_role
    END IF;

    -- SMS Logs Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_logs' AND policyname = 'Users can view own sms logs') THEN
        CREATE POLICY "Users can view own sms logs" ON public.sms_logs FOR SELECT USING (auth.uid() = tenant_id);
    END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_logs' AND policyname = 'Service role can manage sms logs') THEN
        CREATE POLICY "Service role can manage sms logs" ON public.sms_logs USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Migrate Data from legacy 'comms_logs' (IF IT EXISTS)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comms_logs') THEN
        INSERT INTO public.call_logs (tenant_id, created_at, direction, from_number, to_number, status, duration_seconds, cost, recording_url, external_id)
        SELECT 
            tenant_id, 
            created_at, 
            direction, 
            from_number, 
            to_number, 
            status, 
            duration_secs as duration_seconds, 
            cost, 
            recording_url, 
            telnyx_call_control_id as external_id
        FROM public.comms_logs
        WHERE NOT EXISTS (SELECT 1 FROM public.call_logs WHERE external_id = comms_logs.telnyx_call_control_id);
        
        RAISE NOTICE 'Migrated data from comms_logs to call_logs';
    END IF;
END $$;
