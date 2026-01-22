-- 1. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES auth.users(id)
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own tickets" ON public.support_tickets FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Tenants insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Super Admin view all tickets" ON public.support_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Super Admin update all tickets" ON public.support_tickets FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 2. Ticket Messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id), 
    is_admin BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view messages" ON public.ticket_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND tenant_id = auth.uid()));
CREATE POLICY "Tenants insert messages" ON public.ticket_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND tenant_id = auth.uid()));
CREATE POLICY "Super Admin view all messages" ON public.ticket_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Super Admin reply" ON public.ticket_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 3. Telephony Logs
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
    provider_call_id TEXT, from_number TEXT, to_number TEXT, direction TEXT, status TEXT, duration_seconds INTEGER, recording_url TEXT, cost NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own calls" ON public.call_logs FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Super Admin view all calls" ON public.call_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 4. AI Usage Logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenant_profiles(id) ON DELETE CASCADE,
    model TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_cost NUMERIC, context TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own usage" ON public.ai_usage_logs FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Super Admin view all usage" ON public.ai_usage_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 5. Broadcasts
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT, message TEXT, type TEXT, target_audience TEXT, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.system_notifications FOR SELECT USING (expires_at > NOW() OR expires_at IS NULL);
CREATE POLICY "Super Admin manage" ON public.system_notifications FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 6. Webhook Events (Inspector)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT, -- stripe, telnyx
    event_type TEXT,
    payload JSONB,
    status TEXT CHECK (status IN ('processed', 'failed', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admin view webhooks" ON public.webhook_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
