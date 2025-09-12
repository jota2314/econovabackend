-- Create the permit-photos storage bucket for Lead Hunter photo uploads
-- This should be run in the Supabase SQL Editor

-- 1. First, create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'permit-photos',
  'permit-photos', 
  true,  -- Make bucket public for easy photo access
  10485760,  -- 10MB file size limit per photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']  -- Only allow image files
);

-- 2. Set up RLS (Row Level Security) policies for the bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload permit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'permit-photos');

-- Allow public read access to photos (so they can be displayed)
CREATE POLICY "Allow public read access to permit photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'permit-photos');

-- Allow authenticated users to delete their own uploaded photos
CREATE POLICY "Allow authenticated users to delete permit photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'permit-photos');

-- 3. Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;