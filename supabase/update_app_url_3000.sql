-- Update the APP_URL to port 3000
UPDATE public.platform_settings
SET value = 'http://localhost:3000'
WHERE key = 'APP_URL';

-- Verify the change
SELECT * FROM public.platform_settings WHERE key = 'APP_URL';
