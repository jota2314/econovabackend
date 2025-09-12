-- Setup storage bucket and policies for permit photos
-- Run this in your Supabase SQL editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'permit-photos', 
  'permit-photos', 
  false, 
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  10485760
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects table (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create policies for permit-photos bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'permit-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'permit-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'permit-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files (for upsert operations)
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'permit-photos' 
    AND auth.role() = 'authenticated'
  );