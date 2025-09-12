-- Add 'concrete' to area_type constraint in measurements table
-- Date: 2025-09-09

-- Drop existing constraint
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_area_type_check;

-- Add new constraint with 'concrete' included
ALTER TABLE public.measurements 
ADD CONSTRAINT measurements_area_type_check 
CHECK (area_type = ANY (ARRAY['exterior_walls'::text, 'interior_walls'::text, 'ceiling'::text, 'gable'::text, 'roof'::text, 'concrete'::text]));