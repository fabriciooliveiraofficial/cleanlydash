-- Add SIP Credentials and Connection ID to telnyx_settings for Reseller Isolation
ALTER TABLE public.telnyx_settings 
ADD COLUMN IF NOT EXISTS sip_username TEXT,
ADD COLUMN IF NOT EXISTS sip_password TEXT,
ADD COLUMN IF NOT EXISTS telnyx_connection_id TEXT;

-- Index for faster lookups in Webhook
CREATE INDEX IF NOT EXISTS idx_telnyx_settings_phone_number ON public.telnyx_settings(phone_number);

COMMENT ON COLUMN public.telnyx_settings.sip_username IS 'Unique SIP username for the tenant (On-Demand Credential)';
COMMENT ON COLUMN public.telnyx_settings.sip_password IS 'Unique SIP password for the tenant (On-Demand Credential)';
COMMENT ON COLUMN public.telnyx_settings.telnyx_connection_id IS 'ID of the Telnyx SIP Connection this credential belongs to';
