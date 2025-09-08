-- Create HVAC systems catalog for reusable system templates
-- This stores all your HVAC system specifications that can be searched and selected

CREATE TABLE hvac_systems_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- System Identification
  system_name TEXT NOT NULL UNIQUE, -- The searchable name (e.g., "Carrier 3-Ton 16 SEER Heat Pump")
  system_description TEXT, -- Optional detailed description
  
  -- System Specifications (from your form)
  system_type TEXT NOT NULL, -- "Heat Pump", "Central Air", etc.
  ahri_certified_ref TEXT,
  manufacturer TEXT,
  condenser_model TEXT,
  tonnage DECIMAL(4,2),
  seer2 DECIMAL(4,2),
  hspf2 DECIMAL(4,2),
  eer2 DECIMAL(4,2),
  head_unit_model TEXT,
  
  -- Default pricing (can be overridden per job)
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status and organization
  is_active BOOLEAN DEFAULT TRUE,
  category TEXT DEFAULT 'hvac', -- for future expansion
  
  -- Search optimization
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(system_name, '') || ' ' ||
      COALESCE(manufacturer, '') || ' ' ||
      COALESCE(system_type, '') || ' ' ||
      COALESCE(condenser_model, '')
    )
  ) STORED
);

-- Create simplified job HVAC systems table
CREATE TABLE job_hvac_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- System reference (can be from catalog or custom)
  catalog_system_id UUID REFERENCES hvac_systems_catalog(id),
  system_number INTEGER NOT NULL DEFAULT 1,
  
  -- System data (copied from catalog, but editable per job)
  system_name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  ahri_certified_ref TEXT,
  manufacturer TEXT,
  condenser_model TEXT,
  tonnage DECIMAL(4,2),
  seer2 DECIMAL(4,2),
  hspf2 DECIMAL(4,2),
  eer2 DECIMAL(4,2),
  head_unit_model TEXT,
  
  -- Labor & material description (editable per job)
  labor_material_description TEXT,
  
  -- Pricing (can override catalog pricing)
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  
  -- Ductwork calculations (keeping as requested)
  ductwork_linear_feet INTEGER DEFAULT 0,
  ductwork_price_per_foot DECIMAL(8,2) DEFAULT 0,
  ductwork_total DECIMAL(10,2) GENERATED ALWAYS AS (ductwork_linear_feet * COALESCE(ductwork_price_per_foot, 0)) STORED,
  
  -- Constraints
  CONSTRAINT unique_system_number_per_job UNIQUE (job_id, system_number),
  CONSTRAINT positive_quantities CHECK (quantity > 0),
  CONSTRAINT positive_prices CHECK (unit_price >= 0)
);

-- Indexes for performance
CREATE INDEX idx_hvac_catalog_search ON hvac_systems_catalog USING GIN (search_vector);
CREATE INDEX idx_hvac_catalog_active ON hvac_systems_catalog(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_hvac_catalog_manufacturer ON hvac_systems_catalog(manufacturer);
CREATE INDEX idx_hvac_catalog_system_type ON hvac_systems_catalog(system_type);

CREATE INDEX idx_job_hvac_job_id ON job_hvac_systems(job_id);
CREATE INDEX idx_job_hvac_catalog_ref ON job_hvac_systems(catalog_system_id);
CREATE INDEX idx_job_hvac_system_type ON job_hvac_systems(system_type);

-- Enable RLS
ALTER TABLE hvac_systems_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_hvac_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies for catalog (all users can read, managers can modify)
CREATE POLICY "Everyone can view active HVAC systems catalog"
ON hvac_systems_catalog FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Managers can manage HVAC systems catalog"
ON hvac_systems_catalog FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  )
);

-- RLS Policies for job systems (same as job access)
CREATE POLICY "Users can view HVAC systems for accessible jobs"
ON job_hvac_systems FOR SELECT
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = job_hvac_systems.job_id
  )
);

CREATE POLICY "Users can manage HVAC systems for accessible jobs"
ON job_hvac_systems FOR ALL
USING (
  job_id IN (
    SELECT j.id FROM jobs j
    WHERE j.id = job_hvac_systems.job_id
  )
);

-- Update triggers
CREATE OR REPLACE FUNCTION update_hvac_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hvac_catalog_updated_at
    BEFORE UPDATE ON hvac_systems_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_hvac_catalog_updated_at();

CREATE OR REPLACE FUNCTION update_job_hvac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_hvac_updated_at
    BEFORE UPDATE ON job_hvac_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_job_hvac_updated_at();

-- Insert some sample systems to get started
INSERT INTO hvac_systems_catalog (
  system_name, system_type, manufacturer, condenser_model, tonnage, seer2, base_price
) VALUES
('Carrier 2-Ton 16 SEER Central Air', 'Central Air Conditioning', 'Carrier', '24ACC636A003', 2.0, 16.0, 4500.00),
('Trane 3-Ton Heat Pump 18 SEER', 'Heat Pump System', 'Trane', 'XR16', 3.0, 18.0, 6200.00),
('Lennox 2.5-Ton 20 SEER High Efficiency', 'Central Air Conditioning', 'Lennox', 'XC20', 2.5, 20.0, 5800.00),
('Rheem 4-Ton Commercial Unit', 'Commercial HVAC', 'Rheem', 'RCLA048A', 4.0, 15.0, 7500.00),
('Daikin 1.5-Ton Mini Split', 'Mini-Split System', 'Daikin', 'DX18TC', 1.5, 22.0, 3200.00);

-- Comments
COMMENT ON TABLE hvac_systems_catalog IS 'Catalog of reusable HVAC system templates for quick selection';
COMMENT ON TABLE job_hvac_systems IS 'HVAC systems assigned to specific jobs, can reference catalog or be custom';
COMMENT ON COLUMN hvac_systems_catalog.search_vector IS 'Full-text search index for system name, manufacturer, type, and model';
COMMENT ON COLUMN job_hvac_systems.catalog_system_id IS 'Reference to catalog system (null for custom systems)';