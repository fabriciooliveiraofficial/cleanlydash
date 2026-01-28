-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Copy the content of this file.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste and Run.
-- 4. IMPORTANT: You MUST replace 'YOUR_SERVICE_ROLE_KEY_HERE' below with your actual
--    Supabase Service Role Key (found in Project Settings -> API).
-- ==============================================================================

-- 1. Create a private schema for settings (security best practice: hidden from public API)
create schema if not exists private;

create table if not exists private.settings (
  key text primary key,
  value text not null
);

-- Enable RLS on settings just in case, but no policies means no public access
alter table private.settings enable row level security;

-- 2. Insert Settings (REPLACE THE KEY BELOW!)
-- Note: usage of ON CONFLICT to avoid errors if rerunning
insert into private.settings (key, value)
values 
  ('edge_function_url', 'https://jjbokilvurxztqiwvxhy.supabase.co/functions/v1'), 
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE') 
on conflict (key) do update set value = excluded.value;


-- 3. Enable pg_net extension (required for making HTTP requests from DB)
-- NOTE: You must enable this via Supabase Dashboard -> Database -> Extensions -> Search "net" -> Enable
-- DO NOT run this line directly, it will fail with permission denied:
-- create extension if not exists pg_net with schema extensions;


-- 4. Create the Trigger Function
create or replace function public.trigger_push_notification()
returns trigger as $$
declare
    payload jsonb;
    target_user_id uuid;
    notification_title text;
    notification_body text;
    target_url text;
    category_name text;
    settings record;
    edge_url text;
    srv_key text;
begin
    -- Retrieve configuration
    select value into edge_url from private.settings where key = 'edge_function_url';
    select value into srv_key from private.settings where key = 'service_role_key';
    
    if edge_url is null or srv_key is null or srv_key = 'YOUR_SERVICE_ROLE_KEY_HERE' then
        -- Log warning if keys are missing (visible in Postgres logs)
        raise warning 'Push Notification Trigger: Missing configuration (edge_function_url or service_role_key)';
        return new;
    end if;

    -- LOGIC: Determine Target and Content based on Table/Operation
    if (TG_TABLE_NAME = 'bookings') then
        if (TG_OP = 'INSERT') then
            -- A. New Booking (Notify Tenant)
            target_user_id := NEW.tenant_id;
            notification_title := 'Nova Reserva! 📅';
            notification_body := 'Uma nova reserva foi recebida para ' || NEW.property_name;
            target_url := '/bookings/' || NEW.id;
            category_name := 'operational';
        
        elsif (TG_OP = 'UPDATE') then
            -- B. Job Completed (Notify Tenant)
            if (OLD.status != 'completed' and NEW.status = 'completed') then
                target_user_id := NEW.tenant_id;
                notification_title := 'Limpeza Concluída! ✨';
                notification_body := 'O serviço em ' || NEW.property_name || ' foi finalizado.';
                target_url := '/bookings/' || NEW.id;
                category_name := 'operational';
            end if;
        end if;
    end if;

    -- Exit if no notification condition was met
    if target_user_id is null then
        return new;
    end if;

    -- Check User Notification Preferences
    select * into settings from public.tenant_notification_settings where tenant_id = target_user_id;
    
    -- Send if enabled (or if no settings exist, default to TRUE? Here we assume explicit enable)
    -- Assuming logic: if settings exist AND push_enabled is true.
    if settings is not null and settings.push_enabled then
        -- Call Edge Function via pg_net
        perform net.http_post(
            url := edge_url || '/send-native-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || srv_key,
                'apikey', srv_key
            ),
            body := jsonb_build_object(
                'user_id', target_user_id,
                'title', notification_title,
                'body', notification_body,
                'url', target_url,
                'category', category_name
            )
        );
    end if;

    return new;
end;
$$ language plpgsql security definer;


-- 5. Attach Trigger to Tables
-- Drop first to ensure clean state
drop trigger if exists on_booking_created_push on public.bookings;
drop trigger if exists on_booking_updated_push on public.bookings;

create trigger on_booking_created_push
after insert on public.bookings
for each row execute function public.trigger_push_notification();

create trigger on_booking_updated_push
after update on public.bookings
for each row execute function public.trigger_push_notification();
