-- Zone Management System for Lead Hunter
-- Run this SQL in your Supabase SQL editor to add zone functionality

-- Add county field to existing permits table
ALTER TABLE permits ADD COLUMN IF NOT EXISTS county TEXT;

-- Create zones table for custom geographical areas
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Zone identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- Zone type (predefined or custom)
  zone_type TEXT NOT NULL CHECK (zone_type IN ('county', 'city', 'custom', 'territory')),
  
  -- Geographical boundaries (GeoJSON polygon for custom zones)
  boundary_coordinates JSONB,
  
  -- For predefined zones (counties/cities)
  state TEXT CHECK (state IN ('MA', 'NH')),
  county TEXT,
  city TEXT,
  
  -- Assignment and permissions
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id), -- For territory assignment
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Color coding for visual representation
  color_hex TEXT DEFAULT '#FF6B35',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create zone_permits junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS zone_permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE(zone_id, permit_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_permits_county ON permits (county);
CREATE INDEX IF NOT EXISTS idx_permits_city ON permits (city);
CREATE INDEX IF NOT EXISTS idx_permits_state ON permits (state);

CREATE INDEX IF NOT EXISTS idx_zones_type ON zones (zone_type);
CREATE INDEX IF NOT EXISTS idx_zones_state ON zones (state);
CREATE INDEX IF NOT EXISTS idx_zones_county ON zones (county);
CREATE INDEX IF NOT EXISTS idx_zones_city ON zones (city);
CREATE INDEX IF NOT EXISTS idx_zones_assigned_to ON zones (assigned_to);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones (is_active);

CREATE INDEX IF NOT EXISTS idx_zone_permits_zone ON zone_permits (zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_permits_permit ON zone_permits (permit_id);

-- Enable RLS on new tables
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_permits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zones table
CREATE POLICY "Users can view all active zones" ON zones
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create zones" ON zones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own zones" ON zones
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Managers can update any zone" ON zones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );

-- RLS Policies for zone_permits table
CREATE POLICY "Users can view zone permits" ON zone_permits
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create zone permits" ON zone_permits
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete zone permits" ON zone_permits
  FOR DELETE TO authenticated
  USING (true);

-- Function to automatically assign permits to zones based on location
CREATE OR REPLACE FUNCTION assign_permit_to_zones()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign to county zone if exists
  IF NEW.county IS NOT NULL THEN
    INSERT INTO zone_permits (zone_id, permit_id)
    SELECT z.id, NEW.id
    FROM zones z
    WHERE z.zone_type = 'county' 
      AND z.county = NEW.county 
      AND z.state = NEW.state
      AND z.is_active = true
    ON CONFLICT (zone_id, permit_id) DO NOTHING;
  END IF;
  
  -- Auto-assign to city zone if exists
  IF NEW.city IS NOT NULL THEN
    INSERT INTO zone_permits (zone_id, permit_id)
    SELECT z.id, NEW.id
    FROM zones z
    WHERE z.zone_type = 'city' 
      AND z.city = NEW.city 
      AND z.county = NEW.county
      AND z.state = NEW.state
      AND z.is_active = true
    ON CONFLICT (zone_id, permit_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign permits to zones
DROP TRIGGER IF EXISTS trigger_assign_permit_to_zones ON permits;
CREATE TRIGGER trigger_assign_permit_to_zones
  AFTER INSERT OR UPDATE OF county, city, state ON permits
  FOR EACH ROW
  EXECUTE FUNCTION assign_permit_to_zones();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for zones updated_at
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

-- Insert default zones for MA and NH counties
INSERT INTO zones (name, description, zone_type, state, county, is_public, created_by) 
VALUES 
  -- Massachusetts Counties
  ('Middlesex County', 'Middlesex County, Massachusetts', 'county', 'MA', 'Middlesex', true, NULL),
  ('Worcester County', 'Worcester County, Massachusetts', 'county', 'MA', 'Worcester', true, NULL),
  ('Essex County', 'Essex County, Massachusetts', 'county', 'MA', 'Essex', true, NULL),
  ('Norfolk County', 'Norfolk County, Massachusetts', 'county', 'MA', 'Norfolk', true, NULL),
  ('Plymouth County', 'Plymouth County, Massachusetts', 'county', 'MA', 'Plymouth', true, NULL),
  ('Bristol County', 'Bristol County, Massachusetts', 'county', 'MA', 'Bristol', true, NULL),
  ('Suffolk County', 'Suffolk County, Massachusetts', 'county', 'MA', 'Suffolk', true, NULL),
  ('Hampden County', 'Hampden County, Massachusetts', 'county', 'MA', 'Hampden', true, NULL),
  ('Hampshire County', 'Hampshire County, Massachusetts', 'county', 'MA', 'Hampshire', true, NULL),
  ('Berkshire County', 'Berkshire County, Massachusetts', 'county', 'MA', 'Berkshire', true, NULL),
  ('Franklin County', 'Franklin County, Massachusetts', 'county', 'MA', 'Franklin', true, NULL),
  ('Barnstable County', 'Barnstable County, Massachusetts', 'county', 'MA', 'Barnstable', true, NULL),
  ('Dukes County', 'Dukes County, Massachusetts', 'county', 'MA', 'Dukes', true, NULL),
  ('Nantucket County', 'Nantucket County, Massachusetts', 'county', 'MA', 'Nantucket', true, NULL),
  
  -- New Hampshire Counties
  ('Hillsborough County', 'Hillsborough County, New Hampshire', 'county', 'NH', 'Hillsborough', true, NULL),
  ('Rockingham County', 'Rockingham County, New Hampshire', 'county', 'NH', 'Rockingham', true, NULL),
  ('Merrimack County', 'Merrimack County, New Hampshire', 'county', 'NH', 'Merrimack', true, NULL),
  ('Strafford County', 'Strafford County, New Hampshire', 'county', 'NH', 'Strafford', true, NULL),
  ('Cheshire County', 'Cheshire County, New Hampshire', 'county', 'NH', 'Cheshire', true, NULL),
  ('Grafton County', 'Grafton County, New Hampshire', 'county', 'NH', 'Grafton', true, NULL),
  ('Belknap County', 'Belknap County, New Hampshire', 'county', 'NH', 'Belknap', true, NULL),
  ('Carroll County', 'Carroll County, New Hampshire', 'county', 'NH', 'Carroll', true, NULL),
  ('Sullivan County', 'Sullivan County, New Hampshire', 'county', 'NH', 'Sullivan', true, NULL),
  ('Coos County', 'Coos County, New Hampshire', 'county', 'NH', 'Coos', true, NULL)
ON CONFLICT DO NOTHING;

-- Utility function to get permit counts by zone
CREATE OR REPLACE FUNCTION get_zone_permit_counts()
RETURNS TABLE (
  zone_id UUID,
  zone_name TEXT,
  permit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    z.id,
    z.name,
    COUNT(zp.permit_id)
  FROM zones z
  LEFT JOIN zone_permits zp ON z.id = zp.zone_id
  WHERE z.is_active = true
  GROUP BY z.id, z.name
  ORDER BY z.name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON zones TO authenticated;
GRANT SELECT ON zone_permits TO authenticated;
GRANT EXECUTE ON FUNCTION get_zone_permit_counts() TO authenticated;