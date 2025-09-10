-- Permits table for Lead Hunter mapping functionality
-- Run this SQL in your Supabase SQL editor

CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic permit info
  address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'MA',
  zip_code TEXT,
  
  -- Geographic data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geocoded_at TIMESTAMPTZ,
  
  -- Builder info
  builder_name TEXT NOT NULL,
  builder_phone TEXT,
  
  -- Permit details
  permit_type TEXT NOT NULL CHECK (permit_type IN ('residential', 'commercial')),
  notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted_to_lead', 'rejected')),
  
  -- Photo storage
  photo_urls TEXT[], -- Array of photo URLs from Supabase storage
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Future link to leads table
  lead_id UUID REFERENCES leads(id) -- Will be set when converted to lead
);

-- Add RLS (Row Level Security) policies
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see all permits (team visibility)
CREATE POLICY "Users can view all permits" ON permits
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Users can insert permits
CREATE POLICY "Users can create permits" ON permits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update permits they created, or managers can update any
CREATE POLICY "Users can update permits" ON permits
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'manager'
    )
  );

-- Add indexes for performance
CREATE INDEX idx_permits_location ON permits (latitude, longitude);
CREATE INDEX idx_permits_status ON permits (status);
CREATE INDEX idx_permits_created_at ON permits (created_at);
CREATE INDEX idx_permits_builder ON permits (builder_name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permits_updated_at 
  BEFORE UPDATE ON permits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();