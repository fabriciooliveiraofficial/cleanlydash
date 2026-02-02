-- Enable the pg_net extension to make HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.trigger_send_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url TEXT := 'https://jjbokilvurxztqiwvxhy.supabase.co';
    anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';
    request_id BIGINT;
BEGIN
    -- Only trigger if assigned_to has changed and is simply not null
    IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
        
        -- perform the HTTP request
        SELECT net.http_post(
            url := project_url || '/functions/v1/send_booking_notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || anon_key
            ),
            body := jsonb_build_object('booking_id', NEW.id)
        ) INTO request_id;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger on the bookings table
DROP TRIGGER IF EXISTS on_booking_assignment ON public.bookings;

CREATE TRIGGER on_booking_assignment
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_send_booking_notification();
