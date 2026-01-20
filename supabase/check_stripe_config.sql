-- Script to Check Stripe Configuration (Safe Output)

-- 1. Check Key Status
SELECT 
    key, 
    CASE WHEN value IS NOT NULL AND length(value) > 10 THEN '✅ Configured' ELSE '❌ Missing' END as status,
    substring(value, 1, 7) as key_prefix
FROM public.platform_settings 
WHERE key = 'STRIPE_SECRET_KEY';

-- 2. Check Plans Count
SELECT 
    count(*) as total_plans,
    CASE WHEN count(*) > 0 THEN '✅ Plans Loaded' ELSE '❌ Table Empty' END as status
FROM public.plans;
