-- Function to run arbitrary SQL (DANGER: Super Admin Only)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Strict Check: Only Super Admin
  IF (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Access Denied: Super Admin Only';
  END IF;

  -- 1. Try to wrap in JSON Agg (Best for SELECTs)
  BEGIN
    EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;
    
    IF result IS NULL THEN
         RETURN '[{"status": "success", "rows": 0, "message": "Command executed. No rows returned."}]'::jsonb;
    END IF;
    
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- 2. Fallback: Syntax error in wrapping? Try raw execution (For CREATE/INSERT/UPDATE)
    BEGIN
        EXECUTE query;
        RETURN '[{"status": "success", "rows": 0, "message": "Command executed successfully (Non-Select)."}]'::jsonb;
    EXCEPTION WHEN OTHERS THEN
        -- 3. Genuine SQL Error
        RETURN json_build_object('error', SQLERRM, 'details', 'Failed to execute query.')::jsonb;
    END;
  END;
END;
$$;
