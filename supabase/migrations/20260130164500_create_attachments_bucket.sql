-- Create the storage bucket for MMS attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'audio/mpeg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'audio/mpeg', 'video/mp4'];

-- Enable RLS on objects (it should be on by default but good to ensure)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES
-- Allow authenticated users to upload files to their own folder (folder name = customer phone number, but we can just allow authenticated uploads generally for now or scoped to tenant_id if we structure paths like tenant_id/customer_phone/file)
-- For this MVP, we are storing as `{customer_phone}/{filename}`. 
-- Ideally we should prefix with `tenant_id`. Let's assume the frontend uploads to `{customer_phone}/{filename}` is okay for now, but RLS checking phone number ownership is hard without a lookup.
-- SIMPLIFIED POLICY: Authenticated users can upload anywhere in this bucket. (Improvements: restrict path to tenant_id)

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

-- Authenticated users can update/delete their own uploads (owner)
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'attachments' AND owner = auth.uid() );

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'attachments' AND owner = auth.uid() );

-- Public/Authenticated users can view (since it's a public bucket for MMS, media_url needs to be accessible by Telnyx)
-- Telnyx needs to reach it, so it MUST be Public.
CREATE POLICY "Anyone can view attachments"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'attachments' );
