-- Add encryption mode column
ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS encryption TEXT DEFAULT 'tls';

-- Optional: Update existing records based on port as a guess
UPDATE smtp_settings SET encryption = 'ssl' WHERE port = 465;
UPDATE smtp_settings SET encryption = 'tls' WHERE port = 587;
