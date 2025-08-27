-- Migration Script for Enhanced Measurement System
-- Run this after the initial DATABASE.sql

-- Add project_type to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS project_type text 
CHECK (project_type in ('new_construction', 'remodel'));

-- Update measurements table with new fields
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS floor_level text 
CHECK (floor_level in ('first_floor', 'second_floor', 'basement'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS area_type text 
CHECK (area_type in ('roof', 'exterior_walls', 'interior_walls', 'basement_walls'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS insulation_type text 
CHECK (insulation_type in ('closed_cell', 'open_cell', 'hybrid', 'fiberglass', 'roxul'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS r_value decimal(5,1);

-- Update existing measurements with default values if needed
UPDATE public.measurements 
SET floor_level = 'first_floor' 
WHERE floor_level IS NULL;

UPDATE public.measurements 
SET area_type = CASE 
  WHEN surface_type = 'ceiling' THEN 'roof'
  ELSE 'exterior_walls'
END
WHERE area_type IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_measurements_floor_level ON public.measurements(floor_level);
CREATE INDEX IF NOT EXISTS idx_measurements_area_type ON public.measurements(area_type);
CREATE INDEX IF NOT EXISTS idx_jobs_project_type ON public.jobs(project_type);

-- Update RLS policies to ensure proper access
-- Ensure users can access their own data
CREATE POLICY "Users can view their own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = created_by);

-- Enable RLS on tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Policies for measurements
CREATE POLICY "Users can view measurements for their jobs" ON public.measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create measurements for their jobs" ON public.measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update measurements for their jobs" ON public.measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete measurements for their jobs" ON public.measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );