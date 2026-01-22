-- Create a specific schema for communications to keep things organized
CREATE SCHEMA IF NOT EXISTS communications;

-- Grant usage to public roles so they can access tables via API (if we expose them)
GRANT USAGE ON SCHEMA communications TO postgres, anon, authenticated, service_role;

-- 1. Phone Numbers (Owned by Tenants)
CREATE TABLE communications.phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT NOT NULL UNIQUE, -- E.164 format
    provider_id TEXT, -- Telnyx ID
    status TEXT DEFAULT 'active', -- active, released
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversations (Aggregates messages between a Tenant and a Customer)
CREATE TABLE communications.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL, -- Cache the phone in case customer is deleted
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'open', -- open, closed, archived
    unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Messages (Individual SMS/WhatsApp)
CREATE TABLE communications.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES communications.conversations(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
    channel TEXT CHECK (channel IN ('sms', 'whatsapp', 'voice')) DEFAULT 'sms',
    content TEXT,
    media_url TEXT,
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed, read
    external_id TEXT, -- Telnyx Message ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Calls (CDR - Call Detail Records)
CREATE TABLE communications.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    status TEXT DEFAULT 'initiated', -- initiated, answered, busy, completed, failed
    duration_seconds INT DEFAULT 0,
    recording_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communications.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications.calls ENABLE ROW LEVEL SECURITY;

-- Helper function to check tenant access (reusing existing logic if possible, or simple check)
-- Assuming auth.uid() maps to a user with a tenant_id in public.profiles

-- Policy: Users can view data belonging to their Tenant
CREATE POLICY "Users can view their tenant phone numbers" ON communications.phone_numbers
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view their tenant conversations" ON communications.conversations
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view their tenant messages" ON communications.messages
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can view their tenant calls" ON communications.calls
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Policy: Users can insert outbound messages (Edge functions will handle the actual sending, but UI creates the potential record or Edge does it)
-- Usually, UI calls an Edge Function to "Sales/Send", but for a chat UI, we might insert mostly active.
-- Let's allow insert for now if tenant matches.
CREATE POLICY "Users can insert messages for their tenant" ON communications.messages
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Expose schema to API
-- NOTE: In Supabase dashboard -> Settings -> API -> Exposed Schemas, "communications" must be added manually.
