-- Migration to update measurements table with new fields
-- Run this in your Supabase SQL editor

-- Add new columns to measurements table
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS floor_level text;

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS area_type text 
CHECK (area_type IN ('exterior_walls', 'interior_walls', 'ceiling', 'gable', 'roof'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS framing_size text 
CHECK (framing_size IN ('2x4', '2x6', '2x8', '2x10', '2x12'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS insulation_type text 
CHECK (insulation_type IN ('closed_cell', 'open_cell', 'fiberglass', 'roxul'));

ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS r_value text;

-- Note: photo_url column should already exist, but add if missing
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Update existing records with default values if needed
UPDATE public.measurements 
SET 
  floor_level = COALESCE(floor_level, 'First Floor'),
  area_type = COALESCE(area_type, 'exterior_walls'),
  framing_size = COALESCE(framing_size, '2x6'),
  insulation_type = COALESCE(insulation_type, 'closed_cell')
WHERE floor_level IS NULL OR area_type IS NULL OR framing_size IS NULL OR insulation_type IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_measurements_floor_level ON public.measurements(floor_level);
CREATE INDEX IF NOT EXISTS idx_measurements_area_type ON public.measurements(area_type);
CREATE INDEX IF NOT EXISTS idx_measurements_framing_size ON public.measurements(framing_size);
CREATE INDEX IF NOT EXISTS idx_measurements_insulation_type ON public.measurements(insulation_type);

-- Update RLS policies if needed (measurements should inherit from jobs policies)
-- Users can view measurements for their jobs
DROP POLICY IF EXISTS "Users can view measurements for their jobs" ON public.measurements;
CREATE POLICY "Users can view measurements for their jobs" ON public.measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Users can create measurements for their jobs
DROP POLICY IF EXISTS "Users can create measurements for their jobs" ON public.measurements;
CREATE POLICY "Users can create measurements for their jobs" ON public.measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Users can update measurements for their jobs
DROP POLICY IF EXISTS "Users can update measurements for their jobs" ON public.measurements;
CREATE POLICY "Users can update measurements for their jobs" ON public.measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Users can delete measurements for their jobs
DROP POLICY IF EXISTS "Users can delete measurements for their jobs" ON public.measurements;
CREATE POLICY "Users can delete measurements for their jobs" ON public.measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Enable RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'measurements' 
AND table_schema = 'public'
ORDER BY ordinal_position;