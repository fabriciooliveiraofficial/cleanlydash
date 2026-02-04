-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE ERROR
-- This manually adds the missing column that the automated migration failed to apply.

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

-- Optional: Reset any existing nulls to default
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
