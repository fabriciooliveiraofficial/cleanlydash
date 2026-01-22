-- Script to Confirm Email Manually
-- Use this to bypass "Verifique seu email" on localhost

UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'admin@cleanlydash.com'; -- Replace with your email if different

-- Email confirmed manually.
