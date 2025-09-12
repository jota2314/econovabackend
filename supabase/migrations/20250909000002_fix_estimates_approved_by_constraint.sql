-- Fix estimates.approved_by foreign key constraint
-- Date: 2025-09-09

-- Drop incorrect constraint that references jobs(id)
ALTER TABLE public.estimates 
DROP CONSTRAINT IF EXISTS estimates_approved_by_fkey;

-- Add correct constraint that references users(id)
ALTER TABLE public.estimates 
ADD CONSTRAINT estimates_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.users(id);