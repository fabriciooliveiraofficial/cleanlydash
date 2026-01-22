-- Migration: 20240113_stripe_config.sql
-- Purpose: Insert Stripe Configuration Keys into platform_settings

INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder', 'Stripe Publishable Key'),
    ('STRIPE_SECRET_KEY', 'sk_test_placeholder', 'Stripe Secret Key (Backend Only)'),
    ('STRIPE_CLIENT_ID', 'ca_placeholder', 'Stripe Connect Client ID (OAuth)'),
    ('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder', 'Stripe Platform Webhook Secret'),
    ('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_connect_placeholder', 'Stripe Connect Webhook Secret')
ON CONFLICT (key) DO NOTHING;
