-- Add estimate_sent_at column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN estimate_sent_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.estimate_sent_at IS 'Timestamp when the estimate was sent to the customer via email';

-- Create index for better query performance
CREATE INDEX idx_jobs_estimate_sent_at ON public.jobs(estimate_sent_at DESC);
