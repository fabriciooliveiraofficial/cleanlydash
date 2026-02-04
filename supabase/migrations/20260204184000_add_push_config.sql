-- Add push_config column to tenant_notification_settings
ALTER TABLE public.tenant_notification_settings
ADD COLUMN IF NOT EXISTS push_config JSONB DEFAULT '{
    "new_booking": "standard",
    "booking_cancelled": "standard",
    "payment_failed": "standard",
    "low_balance": "standard",
    "new_review": "standard",
    "support_reply": "standard",
    "checklist_completed": "standard",
    "checkin_alert": "standard"
}'::jsonb;

-- Update the existing records to have the default value if null
UPDATE public.tenant_notification_settings
SET push_config = '{
    "new_booking": "standard",
    "booking_cancelled": "standard",
    "payment_failed": "standard",
    "low_balance": "standard",
    "new_review": "standard",
    "support_reply": "standard",
    "checklist_completed": "standard",
    "checkin_alert": "standard"
}'::jsonb
WHERE push_config IS NULL;
