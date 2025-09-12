-- Fix permits table status constraint to include all 8 status options
-- This migration adds the 4 missing status values: 'hot', 'cold', 'visited', 'not_visited'

-- Drop the existing constraint
ALTER TABLE public.permits DROP CONSTRAINT IF EXISTS permits_status_check;

-- Add the updated constraint with all 8 status options
ALTER TABLE public.permits ADD CONSTRAINT permits_status_check 
CHECK (status = ANY (ARRAY[
  'new'::text, 
  'contacted'::text, 
  'converted_to_lead'::text, 
  'rejected'::text,
  'hot'::text,
  'cold'::text,
  'visited'::text,
  'not_visited'::text
]));

-- Update any existing permits that might have invalid statuses (just in case)
-- This is a safety measure to ensure data consistency
UPDATE public.permits 
SET status = 'new' 
WHERE status NOT IN ('new', 'contacted', 'converted_to_lead', 'rejected', 'hot', 'cold', 'visited', 'not_visited');

-- Add a comment to document the change
COMMENT ON CONSTRAINT permits_status_check ON public.permits IS 
'Permits can have 8 status values: new, contacted, converted_to_lead, rejected, hot, cold, visited, not_visited';