-- Migration to add job status tracking to jobs table
-- Generated: 2025-08-30

-- Add job_status field to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS job_status text DEFAULT 'pending';

-- Add constraint for job_status values
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_job_status_check 
CHECK (job_status IN ('pending', 'in_progress', 'won', 'lost'));

-- Add index for faster queries by job_status
CREATE INDEX IF NOT EXISTS idx_jobs_job_status ON public.jobs(job_status);

-- Add comment explaining the new field
COMMENT ON COLUMN public.jobs.job_status IS 'Current status of the job: pending, in_progress, won, or lost';

-- Set default status for existing jobs based on quote_amount
UPDATE public.jobs 
SET job_status = CASE 
  WHEN quote_amount IS NOT NULL AND quote_amount > 0 THEN 'pending'
  ELSE 'pending'
END
WHERE job_status IS NULL;