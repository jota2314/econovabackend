-- Add address fields to jobs table for better project information
-- Generated: 2025-09-01

-- Add project address fields
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS project_address text,
ADD COLUMN IF NOT EXISTS project_city text,
ADD COLUMN IF NOT EXISTS project_state text DEFAULT 'MA',
ADD COLUMN IF NOT EXISTS project_zip_code text;

-- Update project_type constraint to match new requirements (new_construction vs remodel)
-- First check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Try to drop the existing constraint if it exists
    BEGIN
        ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_project_type_check;
    EXCEPTION
        WHEN undefined_object THEN
            -- Constraint doesn't exist, that's fine
            NULL;
    END;
END $$;

-- Add the new constraint
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_project_type_check 
CHECK (project_type IN ('new_construction', 'remodel'));

-- Remove structural_framing and roof_rafters from job creation (will be in measurements)
-- Note: We'll keep the columns for backward compatibility but won't require them in job creation

-- Add comment explaining the new fields
COMMENT ON COLUMN public.jobs.project_address IS 'Street address of the project location';
COMMENT ON COLUMN public.jobs.project_city IS 'City of the project location';
COMMENT ON COLUMN public.jobs.project_state IS 'State of the project location (defaults to MA)';
COMMENT ON COLUMN public.jobs.project_zip_code IS 'ZIP code of the project location';
