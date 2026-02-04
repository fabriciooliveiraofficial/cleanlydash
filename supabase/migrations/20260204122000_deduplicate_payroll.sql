-- 1. Deduplicate payroll_entries first to avoid FK issues
-- We keep only the entries belonging to the latest period ID for each range
WITH Duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY tenant_id, period_start, period_end 
        ORDER BY created_at DESC
    ) as row_num
    FROM public.payroll_periods
)
DELETE FROM public.payroll_entries
WHERE period_id IN (
    SELECT id FROM Duplicates WHERE row_num > 1
);

-- 2. Deduplicate payroll_periods
WITH Duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY tenant_id, period_start, period_end 
        ORDER BY created_at DESC
    ) as row_num
    FROM public.payroll_periods
)
DELETE FROM public.payroll_periods
WHERE id IN (
    SELECT id FROM Duplicates WHERE row_num > 1
);

-- 3. Add unique constraint to prevent future duplicates
ALTER TABLE public.payroll_periods 
DROP CONSTRAINT IF EXISTS unique_payroll_period_per_tenant;

ALTER TABLE public.payroll_periods 
ADD CONSTRAINT unique_payroll_period_per_tenant 
UNIQUE (tenant_id, period_start, period_end);
