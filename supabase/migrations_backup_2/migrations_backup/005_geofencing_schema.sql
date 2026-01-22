-- 005_geofencing_schema.sql

-- Add coordinates to customers (properties)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS geofence_radius integer DEFAULT 200; -- in meters

-- Enable PostGIS if available (optional, but good for future)
-- create extension if not exists postgis;
