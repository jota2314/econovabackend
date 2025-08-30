-- Migration to add hybrid spray foam system support
-- Generated: 2025-08-30
-- This migration adds fields for closed cell and open cell inch measurements for hybrid systems

-- Add hybrid support fields to insulation_measurements
ALTER TABLE public.insulation_measurements 
ADD COLUMN closed_cell_inches numeric DEFAULT 0,
ADD COLUMN open_cell_inches numeric DEFAULT 0,
ADD COLUMN is_hybrid_system boolean DEFAULT false;

-- Add hybrid to the insulation_type enum
ALTER TABLE public.insulation_measurements 
DROP CONSTRAINT IF EXISTS insulation_measurements_insulation_type_check;

ALTER TABLE public.insulation_measurements 
ADD CONSTRAINT insulation_measurements_insulation_type_check 
CHECK (insulation_type = ANY (ARRAY['closed_cell'::text, 'open_cell'::text, 'batt'::text, 'blown_in'::text, 'hybrid'::text]));

-- Add the same fields to the measurements table for consistency
ALTER TABLE public.measurements 
ADD COLUMN closed_cell_inches numeric DEFAULT 0,
ADD COLUMN open_cell_inches numeric DEFAULT 0,
ADD COLUMN is_hybrid_system boolean DEFAULT false;

-- Update measurements table constraint too
ALTER TABLE public.measurements 
DROP CONSTRAINT IF EXISTS measurements_insulation_type_check;

ALTER TABLE public.measurements 
ADD CONSTRAINT measurements_insulation_type_check 
CHECK (insulation_type = ANY (ARRAY['closed_cell'::text, 'open_cell'::text, 'batt'::text, 'blown_in'::text, 'hybrid'::text]));

-- Add comment explaining the new fields
COMMENT ON COLUMN public.insulation_measurements.closed_cell_inches IS 'Inches of closed cell spray foam for hybrid systems';
COMMENT ON COLUMN public.insulation_measurements.open_cell_inches IS 'Inches of open cell spray foam for hybrid systems';
COMMENT ON COLUMN public.insulation_measurements.is_hybrid_system IS 'Whether this measurement uses a hybrid (closed + open cell) system';

COMMENT ON COLUMN public.measurements.closed_cell_inches IS 'Inches of closed cell spray foam for hybrid systems';
COMMENT ON COLUMN public.measurements.open_cell_inches IS 'Inches of open cell spray foam for hybrid systems';
COMMENT ON COLUMN public.measurements.is_hybrid_system IS 'Whether this measurement uses a hybrid (closed + open cell) system';