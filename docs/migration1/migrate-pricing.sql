-- Drop existing pricing_catalog table and recreate with correct structure
DROP TABLE IF EXISTS public.pricing_catalog CASCADE;

-- Create new pricing_catalog table
CREATE TABLE public.pricing_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type text CHECK (service_type IN ('insulation', 'hvac', 'plaster')) NOT NULL,
  item_name text NOT NULL,
  unit text NOT NULL,
  base_price decimal(10,2) NOT NULL,
  markup_percentage decimal(5,2) DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index
CREATE INDEX idx_pricing_catalog_service_type ON public.pricing_catalog(service_type);

-- Enable RLS
ALTER TABLE public.pricing_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view pricing catalog" ON public.pricing_catalog
  FOR SELECT USING (true);

CREATE POLICY "Managers can manage pricing catalog" ON public.pricing_catalog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
    )
  );

-- Insert Open Cell Spray Foam pricing data
INSERT INTO public.pricing_catalog (service_type, item_name, unit, base_price, markup_percentage, notes) VALUES
('insulation', 'Open Cell R-0-15 (3.5")', 'sq ft', 1.65, 0, 'R-3.8/inch | Range: R-0 to R-15 | Thickness: 3.5"'),
('insulation', 'Open Cell R-16-21 (5.5")', 'sq ft', 1.90, 0, 'R-3.8/inch | Range: R-16 to R-21 | Thickness: 5.5"'),
('insulation', 'Open Cell R-22-28 (7")', 'sq ft', 2.20, 0, 'R-3.8/inch | Range: R-22 to R-28 | Thickness: 7"'),
('insulation', 'Open Cell R-29-30.9 (8")', 'sq ft', 2.40, 0, 'R-3.8/inch | Range: R-29 to R-30.9 | Thickness: 8"'),
('insulation', 'Open Cell R-31-34 (9")', 'sq ft', 2.60, 0, 'R-3.8/inch | Range: R-31 to R-34 | Thickness: 9"'),
('insulation', 'Open Cell R-35-38 (10")', 'sq ft', 2.90, 0, 'R-3.8/inch | Range: R-35 to R-38 | Thickness: 10"'),
('insulation', 'Open Cell R-39-45 (12")', 'sq ft', 3.30, 0, 'R-3.8/inch | Range: R-39 to R-45 | Thickness: 12"'),
('insulation', 'Open Cell R-46-49 (13")', 'sq ft', 3.50, 0, 'R-3.8/inch | Range: R-46 to R-49 | Thickness: 13"'),
('insulation', 'Open Cell R-50-999 (13+")', 'sq ft', 3.50, 0, 'R-3.8/inch | Range: R-50 to R-999 | Thickness: 13+"');

-- Insert Closed Cell Spray Foam pricing data  
INSERT INTO public.pricing_catalog (service_type, item_name, unit, base_price, markup_percentage, notes) VALUES
('insulation', 'Closed Cell R-0-7 (1")', 'sq ft', 1.80, 0, 'R-7/inch | Range: R-0 to R-7 | Thickness: 1"'),
('insulation', 'Closed Cell R-8-13 (1.5")', 'sq ft', 2.30, 0, 'R-7/inch | Range: R-8 to R-13 | Thickness: 1.5"'),
('insulation', 'Closed Cell R-14-15.9 (2")', 'sq ft', 2.80, 0, 'R-7/inch | Range: R-14 to R-15.9 | Thickness: 2"'),
('insulation', 'Closed Cell R-16-19 (2.5")', 'sq ft', 3.60, 0, 'R-7/inch | Range: R-16 to R-19 | Thickness: 2.5"'),
('insulation', 'Closed Cell R-20-21.9 (3")', 'sq ft', 3.90, 0, 'R-7/inch | Range: R-20 to R-21.9 | Thickness: 3"'),
('insulation', 'Closed Cell R-22-30.9 (4")', 'sq ft', 5.70, 0, 'R-7/inch | Range: R-22 to R-30.9 | Thickness: 4"'),
('insulation', 'Closed Cell R-31-38.9 (5")', 'sq ft', 6.80, 0, 'R-7/inch | Range: R-31 to R-38.9 | Thickness: 5"'),
('insulation', 'Closed Cell R-39-49.9 (7")', 'sq ft', 8.70, 0, 'R-7/inch | Range: R-39 to R-49.9 | Thickness: 7"'),
('insulation', 'Closed Cell R-50-999 (7+")', 'sq ft', 8.70, 0, 'R-7/inch | Range: R-50 to R-999 | Thickness: 7+"');
