-- Migration to add service_type and approval tracking to estimates table
-- Generated: 2025-08-30

-- Add service_type to estimates table to filter by service
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS service_type text;

-- Add constraint for service_type values
ALTER TABLE public.estimates 
ADD CONSTRAINT estimates_service_type_check 
CHECK (service_type IN ('insulation', 'hvac', 'plaster'));

-- Add approval tracking fields
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update the status to include 'pending_approval' if needed
ALTER TABLE public.estimates 
DROP CONSTRAINT IF EXISTS estimates_status_check;

ALTER TABLE public.estimates 
ADD CONSTRAINT estimates_status_check 
CHECK (status IN ('draft', 'pending_approval', 'sent', 'approved', 'rejected'));

-- Add index for faster queries by service_type and status
CREATE INDEX IF NOT EXISTS idx_estimates_service_type ON public.estimates(service_type);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at);

-- Add comments explaining the new fields
COMMENT ON COLUMN public.estimates.service_type IS 'Type of service for this estimate (insulation, hvac, plaster)';
COMMENT ON COLUMN public.estimates.approved_by IS 'User ID of the manager who approved this estimate';
COMMENT ON COLUMN public.estimates.approved_at IS 'Timestamp when the estimate was approved';

-- Update service_type based on job's service_type (for existing records)
UPDATE public.estimates e
SET service_type = j.service_type
FROM public.jobs j
WHERE e.job_id = j.id
AND e.service_type IS NULL;