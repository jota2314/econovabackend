-- Add workflow_status column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN workflow_status TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.workflow_status IS 'Current workflow status of the job (send_to_customer, follow_up_1, etc.)';

-- Create index for better query performance
CREATE INDEX idx_jobs_workflow_status ON public.jobs(workflow_status);

