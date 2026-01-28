-- 1. Create a function to trigger the push notification Edge Function
-- This function will be called by various database triggers.

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    target_user_id UUID;
    notification_title TEXT;
    notification_body TEXT;
    target_url TEXT;
    category_name TEXT;
    settings RECORD;
    edge_function_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Get Edge Function details from vault/env (Simplified for migration)
    -- This assumes you trigger the function via HTTP directly or via pg_net
    -- For simplicity in this demo, we use pg_net if available or just log it
    
    -- Determine the target user and content based on the table
    IF (TG_TABLE_NAME = 'bookings') THEN
        IF (TG_OP = 'INSERT') THEN
            target_user_id := NEW.tenant_id; -- Assuming tenant_id is the owner
            notification_title := 'Nova Reserva! 📅';
            notification_body := 'Uma nova reserva foi recebida para ' || NEW.property_name;
            target_url := '/bookings/' || NEW.id;
            category_name := 'operational';
        END IF;
    ELSIF (TG_TABLE_NAME = 'support_tickets') THEN
        IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'replied') THEN
            target_user_id := NEW.user_id;
            notification_title := 'Suporte Airgoverness 💬';
            notification_body := 'Você recebeu uma nova resposta no seu ticket #' || NEW.ticket_number;
            target_url := '/support/' || NEW.id;
            category_name := 'communication';
        END IF;
    END IF;

    -- check user settings before sending
    SELECT * INTO settings FROM public.tenant_notification_settings WHERE tenant_id = target_user_id;
    
    IF settings IS NOT NULL AND settings.push_enabled AND (settings.events->category_name)::boolean THEN
        -- Call Edge Function via pg_net (Supabase's built-in async HTTP client)
        -- Note: Requires pg_net extension enabled
        PERFORM net.http_post(
            url := (SELECT value FROM private.settings WHERE key = 'edge_function_url') || '/send-native-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT value FROM private.settings WHERE key = 'service_role_key')
            ),
            body := jsonb_build_object(
                'user_id', target_user_id,
                'title', notification_title,
                'body', notification_body,
                'url', target_url,
                'category', category_name
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The above is a TEMPLATE. Real production implementation 
-- usually uses Supabase Database Webhooks (UI) for better maintainability.
