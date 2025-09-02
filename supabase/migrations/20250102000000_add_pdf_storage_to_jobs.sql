-- Add PDF storage columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN latest_estimate_pdf_url TEXT,
ADD COLUMN latest_estimate_pdf_name TEXT,
ADD COLUMN pdf_generated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.latest_estimate_pdf_url IS 'URL to the latest generated estimate PDF in Supabase Storage';
COMMENT ON COLUMN public.jobs.latest_estimate_pdf_name IS 'Original filename of the latest estimate PDF';
COMMENT ON COLUMN public.jobs.pdf_generated_at IS 'Timestamp when the latest PDF was generated';

-- Create index for better query performance
CREATE INDEX idx_jobs_pdf_generated_at ON public.jobs(pdf_generated_at DESC);
