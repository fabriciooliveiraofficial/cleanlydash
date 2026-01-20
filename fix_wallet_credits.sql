-- Add $50.00 credits to the current user's wallet
UPDATE public.wallets
SET balance = balance + 50.00
WHERE user_id = auth.uid();
