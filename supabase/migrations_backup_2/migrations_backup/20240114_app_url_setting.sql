-- Add APP_URL to platform_settings for dynamic invite redirects
-- This allows easy migration from development to production

INSERT INTO platform_settings (key, value, description)
VALUES (
    'APP_URL',
    'http://localhost:5173',
    'Base URL for the application. Update this when deploying to production (e.g., https://cleanlydash.com)'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
