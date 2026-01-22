-- Add unique constraints to tenant_profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_profiles_email_key') THEN
        ALTER TABLE public.tenant_profiles ADD CONSTRAINT tenant_profiles_email_key UNIQUE (email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_profiles_phone_key') THEN
        ALTER TABLE public.tenant_profiles ADD CONSTRAINT tenant_profiles_phone_key UNIQUE (phone);
    END IF;
END $$;

-- Update the handle_new_tenant function to populate email and phone
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
DECLARE
  tenant_name TEXT;
  phone_number TEXT;
  base_slug TEXT;
  final_slug TEXT;
  suffix TEXT;
BEGIN
  -- Extract metadata
  tenant_name := new.raw_user_meta_data->>'tenant_name';
  phone_number := new.raw_user_meta_data->>'phone'; -- Extract phone from metadata
  
  -- Validation (Optional: could rely on table constraints, but good to check)
  IF tenant_name IS NULL THEN
    RETURN new;
  END IF;

  -- Generate Slug
  base_slug := public.slugify(tenant_name);
  suffix := substring(md5(random()::text) from 1 for 4);
  final_slug := base_slug || '-' || suffix;

  -- Insert into tenant_profiles with email and phone
  -- email comes from the auth.users record (new.email)
  INSERT INTO public.tenant_profiles (id, slug, name, email, phone)
  VALUES (new.id, final_slug, tenant_name, new.email, phone_number);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
