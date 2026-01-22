-- Function to generate slug from text
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(value, 'áàâãäåāăąèééêëēĕėęěìíîïìĩīĭįòóôõöōŏőùúûüũūŭůűýÿñç·/_,:;', 'aaaaaaaaaeeeeeeeeeeiiiiiiiiioooooooouuuuuuuuuuuyync------'),
        '[^a-z0-9 -]', '', 'g' -- remove invalid chars
      ),
      '\s+', '-', 'g' -- collapse whitespace to hyphen
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to handle new tenant creation
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
DECLARE
  tenant_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  suffix TEXT;
BEGIN
  -- Extract tenant_name from metadata (injected by AuthFlow)
  tenant_name := new.raw_user_meta_data->>'tenant_name';

  -- If no tenant_name, skip (might be a regular user invite, handled elsewhere? or treat as error?)
  -- For now, if inviting existing user to team, we don't create profile. 
  -- But this trigger runs on NEW user. 
  -- If invited user accept invite, they are "new" in auth.users? 
  -- If invited user, they might not have tenant_name in metadata.
  
  IF tenant_name IS NULL THEN
    RETURN new;
  END IF;

  -- Generate Base Slug
  base_slug := public.slugify(tenant_name);
  
  -- Generate Random Suffix (4 chars) to ensure uniqueness
  suffix := substring(md5(random()::text) from 1 for 4);
  final_slug := base_slug || '-' || suffix;

  -- Insert into tenant_profiles
  INSERT INTO public.tenant_profiles (id, slug, name)
  VALUES (new.id, final_slug, tenant_name);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();
