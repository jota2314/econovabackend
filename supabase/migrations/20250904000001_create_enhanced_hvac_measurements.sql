-- Create enhanced HVAC measurements table for professional HVAC systems
-- This supports AHRI certification, multiple system types, and complex pricing

CREATE TABLE enhanced_hvac_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Basic measurement fields (inherited from BaseMeasurement)
  room_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- System Identification
  system_number INTEGER NOT NULL CHECK (system_number >= 1),
  system_description TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK (system_type IN ('central_air', 'heat_pump', 'furnace', 'mini_split')),
  
  -- AHRI Certification Details
  ahri_number TEXT NOT NULL,
  outdoor_model TEXT NOT NULL,
  indoor_model TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  tonnage DECIMAL(4,2) NOT NULL CHECK (tonnage >= 0.5 AND tonnage <= 20),
  seer2_rating DECIMAL(4,2) CHECK (seer2_rating >= 10 AND seer2_rating <= 30),
  hspf2_rating DECIMAL(4,2) CHECK (hspf2_rating >= 6 AND hspf2_rating <= 15),
  eer2_rating DECIMAL(4,2) CHECK (eer2_rating >= 8 AND eer2_rating <= 20),
  ahri_certified BOOLEAN DEFAULT FALSE,
  
  -- Installation Specifications
  ductwork_linear_feet INTEGER DEFAULT 0 CHECK (ductwork_linear_feet >= 0),
  supply_vents INTEGER DEFAULT 0 CHECK (supply_vents >= 0),
  return_vents INTEGER DEFAULT 0 CHECK (return_vents >= 0),
  installation_complexity TEXT DEFAULT 'standard' CHECK (installation_complexity IN ('standard', 'moderate', 'complex')),
  
  -- Additional Services
  existing_system_removal BOOLEAN DEFAULT FALSE,
  electrical_upgrade_required BOOLEAN DEFAULT FALSE,
  permit_required BOOLEAN DEFAULT TRUE,
  startup_testing_required BOOLEAN DEFAULT TRUE,
  
  -- Project Details
  installation_location TEXT,
  special_requirements TEXT,
  notes TEXT,
  
  -- Pricing (managers only)
  price_override DECIMAL(10,2),
  override_reason TEXT,
  calculated_price DECIMAL(10,2),
  
  -- Ensure unique system numbers per job
  CONSTRAINT unique_system_per_job UNIQUE (job_id, system_number)
);

-- Create indexes for performance
CREATE INDEX idx_enhanced_hvac_job_id ON enhanced_hvac_measurements(job_id);
CREATE INDEX idx_enhanced_hvac_system_type ON enhanced_hvac_measurements(system_type);
CREATE INDEX idx_enhanced_hvac_manufacturer ON enhanced_hvac_measurements(manufacturer);
CREATE INDEX idx_enhanced_hvac_tonnage ON enhanced_hvac_measurements(tonnage);

-- Enable Row Level Security
ALTER TABLE enhanced_hvac_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view measurements for jobs they have access to
CREATE POLICY "Users can view enhanced HVAC measurements for accessible jobs"
ON enhanced_hvac_measurements FOR SELECT
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = enhanced_hvac_measurements.job_id
    -- Add additional job access checks as needed
  )
);

-- Users can insert measurements for jobs they have access to
CREATE POLICY "Users can insert enhanced HVAC measurements for accessible jobs"
ON enhanced_hvac_measurements FOR INSERT
WITH CHECK (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = enhanced_hvac_measurements.job_id
    -- Add additional job access checks as needed
  )
);

-- Users can update measurements for jobs they have access to
-- But only managers can update price_override fields
CREATE POLICY "Users can update enhanced HVAC measurements for accessible jobs"
ON enhanced_hvac_measurements FOR UPDATE
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = enhanced_hvac_measurements.job_id
    -- Add additional job access checks as needed
  )
)
WITH CHECK (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = enhanced_hvac_measurements.job_id
    -- Add additional job access checks as needed
  )
  AND (
    -- If price_override is being changed, user must be manager
    (OLD.price_override IS DISTINCT FROM NEW.price_override AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager'
    ))
    OR OLD.price_override IS NOT DISTINCT FROM NEW.price_override
  )
);

-- Users can delete measurements for jobs they have access to
CREATE POLICY "Users can delete enhanced HVAC measurements for accessible jobs"
ON enhanced_hvac_measurements FOR DELETE
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = enhanced_hvac_measurements.job_id
    -- Add additional job access checks as needed
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_enhanced_hvac_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enhanced_hvac_measurements_updated_at
    BEFORE UPDATE ON enhanced_hvac_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_enhanced_hvac_measurements_updated_at();

-- Add helpful comments
COMMENT ON TABLE enhanced_hvac_measurements IS 'Enhanced HVAC measurements with AHRI certification and professional specifications';
COMMENT ON COLUMN enhanced_hvac_measurements.system_type IS 'Type of HVAC system: central_air, heat_pump, furnace, mini_split';
COMMENT ON COLUMN enhanced_hvac_measurements.ahri_number IS 'AHRI (Air-Conditioning, Heating, and Refrigeration Institute) certification number';
COMMENT ON COLUMN enhanced_hvac_measurements.seer2_rating IS 'Seasonal Energy Efficiency Ratio 2 (cooling efficiency)';
COMMENT ON COLUMN enhanced_hvac_measurements.hspf2_rating IS 'Heating Seasonal Performance Factor 2 (heat pump heating efficiency)';
COMMENT ON COLUMN enhanced_hvac_measurements.eer2_rating IS 'Energy Efficiency Ratio 2 (cooling efficiency at specific conditions)';
COMMENT ON COLUMN enhanced_hvac_measurements.installation_complexity IS 'Installation complexity level affecting pricing: standard, moderate, complex';
COMMENT ON COLUMN enhanced_hvac_measurements.price_override IS 'Manager-only price override for custom pricing';