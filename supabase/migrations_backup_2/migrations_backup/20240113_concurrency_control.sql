-- Migration: 20240113_concurrency_control.sql
-- Purpose: Enforce Single Active Session per User & Seat Limits

-- 1. Function to Enforce Single Session
-- Triggered AFTER INSERT on active_sessions
-- If a new session is created, delete all OTHER sessions for this user.

CREATE OR REPLACE FUNCTION public.enforce_single_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all other sessions for this user (excluding the one just created)
    DELETE FROM public.active_sessions
    WHERE user_id = NEW.user_id
    AND session_id != NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_created_concurrency ON public.active_sessions;
CREATE TRIGGER on_session_created_concurrency
    AFTER INSERT ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_session();

-- 2. Function to Check Seat Limits (for Invites/Signups)
-- Usage: Call this before adding a new team member.

CREATE OR REPLACE FUNCTION public.check_seat_limits(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_id TEXT;
    v_combo_id TEXT;
    v_limit INT;
    v_current_count INT;
    v_limits_json JSONB;
BEGIN
    -- Get Current Plan
    SELECT plan_id, combo_id INTO v_plan_id, v_combo_id
    FROM public.tenant_subscriptions
    WHERE tenant_id = p_tenant_id
    AND status = 'active';

    IF v_plan_id IS NULL AND v_combo_id IS NULL THEN
        -- No active plan? Default to 0 or 1? Let's say 1 (Owner)
        v_limit := 1;
    ELSE
        -- Fetch limits from Plan OR Combo
        -- Simplification: If Combo, get limits of the 'system' plan inside it.
        -- Or stored explicitly. Implementation Plan 20240111 stored limits in `plans`.
        
        -- If it's a Combo, we need to resolve the System Plan ID. 
        -- But `plans` table has the limits. 
        -- Assuming subscription points to a Plan ID usually for "System". 
        
        -- Let's fetch limits from the `plans` table using the ID directly if present, 
        -- or resolve combo -> included_plans -> filter type='system'
        
        IF v_plan_id IS NOT NULL THEN
            SELECT limits INTO v_limits_json FROM public.plans WHERE id = v_plan_id;
        ELSIF v_combo_id IS NOT NULL THEN
             -- Complex: Get the System Plan from the Combo
             -- We assume the first 'system' plan in the combo determines users.
             SELECT p.limits INTO v_limits_json
             FROM public.combos c, unnest(c.included_plan_ids) as pid
             JOIN public.plans p ON p.id = pid
             WHERE c.id = v_combo_id AND p.type = 'system'
             LIMIT 1;
        END IF;

        -- Extract "users" limit
        v_limit := COALESCE((v_limits_json->>'users')::INT, 1);
    END IF;

    -- Count Current Users for this Tenant
    SELECT COUNT(*) INTO v_current_count
    FROM public.team_members
    WHERE tenant_id = p_tenant_id
    AND status = 'active';

    IF v_current_count >= v_limit THEN
       RETURN FALSE;
    END IF;
    
    RETURN TRUE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
