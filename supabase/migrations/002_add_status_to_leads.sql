-- Add status field to leads table
ALTER TABLE leads 
ADD COLUMN status VARCHAR(50) 
CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost')) 
DEFAULT 'new';

-- Create index for performance
CREATE INDEX idx_leads_status ON leads(status);

-- Update existing records to have 'new' status
UPDATE leads SET status = 'new' WHERE status IS NULL;