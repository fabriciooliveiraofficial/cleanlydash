-- Add duration_minutes to addons table
ALTER TABLE addons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

-- Optional: Update existing addons with some default values if needed
-- UPDATE addons SET duration_minutes = 30 WHERE name ILIKE '%oven%';
-- UPDATE addons SET duration_minutes = 60 WHERE name ILIKE '%fridge%';
