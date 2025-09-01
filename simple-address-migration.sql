-- Simple migration to add address fields to jobs table
-- Run this in Supabase SQL Editor

-- Add project address fields only
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS project_address text,
ADD COLUMN IF NOT EXISTS project_city text,
ADD COLUMN IF NOT EXISTS project_state text DEFAULT 'MA',
ADD COLUMN IF NOT EXISTS project_zip_code text;

-- Add comments explaining the new fields
COMMENT ON COLUMN public.jobs.project_address IS 'Street address of the project location';
COMMENT ON COLUMN public.jobs.project_city IS 'City of the project location';
COMMENT ON COLUMN public.jobs.project_state IS 'State of the project location (defaults to MA)';
COMMENT ON COLUMN public.jobs.project_zip_code IS 'ZIP code of the project location';

-- Check current project_type constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.jobs'::regclass 
AND conname LIKE '%project_type%';
