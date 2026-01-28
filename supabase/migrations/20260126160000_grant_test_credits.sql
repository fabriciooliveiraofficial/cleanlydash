
-- Grant credits migration
UPDATE wallets SET balance = balance + 50.00 WHERE balance < 50.00;
