-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload config';

-- Add a comment to ensuring DDL activity is logged/processed
COMMENT ON TABLE public.inventory_items IS 'Inventory Items Definition (Cache Refreshed)';
