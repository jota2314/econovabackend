-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  
  -- Status & Priority
  followup_priority VARCHAR(20) CHECK (followup_priority IN ('hot', 'warm', 'cold')) DEFAULT 'warm',
  
  -- Lead Source
  lead_source VARCHAR(50) CHECK (lead_source IN ('website', 'referral', 'drive_by', 'permit', 'other')) DEFAULT 'other',
  
  -- Tracking
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Future AI Integration
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  budget_range VARCHAR(50),
  timeline VARCHAR(50),
  
  -- Additional
  notes TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_leads_followup_priority ON leads(followup_priority);
CREATE INDEX idx_leads_lead_source ON leads(lead_source);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_next_followup ON leads(next_followup_date);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth needs)
CREATE POLICY "Users can view all leads" ON leads
  FOR SELECT USING (true);

CREATE POLICY "Users can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leads" ON leads
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete leads" ON leads
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO leads (
  name, 
  email, 
  phone, 
  company, 
  followup_priority, 
  lead_source, 
  lead_score, 
  budget_range,
  timeline,
  last_contact_date, 
  next_followup_date,
  address,
  city,
  state,
  zip_code,
  notes
) VALUES 
  ('John Smith', 'john.smith@example.com', '(555) 123-0001', 'Smith Construction', 'hot', 'website', 85, '$50,000-$75,000', '2-3 months', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', '123 Main St', 'Springfield', 'IL', '62701', 'Interested in kitchen renovation'),
  
  ('Sarah Johnson', 'sarah.j@example.com', '(555) 123-0002', 'Johnson Homes', 'warm', 'referral', 65, '$25,000-$50,000', '3-6 months', NOW() - INTERVAL '3 days', NOW() + INTERVAL '5 days', '456 Oak Ave', 'Springfield', 'IL', '62702', 'Looking for bathroom remodel'),
  
  ('Mike Wilson', 'mike.w@example.com', '(555) 123-0003', 'Wilson Renovations', 'hot', 'drive_by', 90, '$75,000-$100,000', '1-2 months', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '1 day', '789 Pine St', 'Springfield', 'IL', '62703', 'Whole house renovation project'),
  
  ('Emily Davis', 'emily.d@example.com', '(555) 123-0004', 'Davis Properties', 'cold', 'permit', 45, '$10,000-$25,000', '6+ months', NOW() - INTERVAL '7 days', NOW() + INTERVAL '14 days', '321 Elm St', 'Springfield', 'IL', '62704', 'Small repair work needed'),
  
  ('Robert Brown', 'robert.b@example.com', '(555) 123-0005', 'Brown Building Co', 'warm', 'website', 70, '$50,000-$75,000', '2-4 months', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days', '654 Maple Dr', 'Springfield', 'IL', '62705', 'New construction project'),
  
  ('Lisa Anderson', 'lisa.a@example.com', '(555) 123-0006', 'Anderson Interiors', 'hot', 'referral', 95, '$100,000+', '1-2 months', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '6 hours', '987 Cedar Ln', 'Springfield', 'IL', '62706', 'High-end kitchen and bath remodel'),
  
  ('David Martinez', 'david.m@example.com', '(555) 123-0007', 'Martinez Construction', 'warm', 'other', 60, '$25,000-$50,000', '3-4 months', NOW() - INTERVAL '5 days', NOW() + INTERVAL '7 days', '147 Birch St', 'Springfield', 'IL', '62707', 'Basement finishing'),
  
  ('Jennifer Taylor', 'jen.t@example.com', '(555) 123-0008', 'Taylor Homes', 'cold', 'website', 40, '$10,000-$25,000', '6+ months', NOW() - INTERVAL '10 days', NOW() + INTERVAL '21 days', '258 Walnut Ave', 'Springfield', 'IL', '62708', 'Future project planning'),
  
  ('Chris Thomas', 'chris.t@example.com', '(555) 123-0009', 'Thomas Realty', 'hot', 'drive_by', 88, '$75,000-$100,000', '1-3 months', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '1 day', '369 Cherry St', 'Springfield', 'IL', '62709', 'Multi-unit renovation'),
  
  ('Amanda White', 'amanda.w@example.com', '(555) 123-0010', 'White Properties', 'warm', 'permit', 72, '$50,000-$75,000', '2-3 months', NOW() - INTERVAL '2 days', NOW() + INTERVAL '4 days', '741 Spruce Way', 'Springfield', 'IL', '62710', 'Commercial renovation project');