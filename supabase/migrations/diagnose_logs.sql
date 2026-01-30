-- DIAGNOSIS SCRIPT
-- Run this in Supabase SQL Editor to see where your data is.

SELECT 'comms_logs (Legacy)' as table_name, count(*) as row_count FROM comms_logs
UNION ALL
SELECT 'call_logs (New)', count(*) FROM call_logs
UNION ALL
SELECT 'sms_logs (New)', count(*) FROM sms_logs
UNION ALL
SELECT 'tenants (Total)', count(*) FROM tenants;
