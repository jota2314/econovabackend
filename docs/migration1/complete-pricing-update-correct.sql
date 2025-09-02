-- Complete pricing catalog update with correct data
-- Step 1: Add description column if it doesn't exist
ALTER TABLE public.pricing_catalog ADD COLUMN IF NOT EXISTS description text;

-- Step 2: Clear existing data
DELETE FROM public.pricing_catalog WHERE service_type = 'insulation';

-- Step 3: Insert all products with correct data
INSERT INTO public.pricing_catalog (service_type, description, item_name, unit, base_price, markup_percentage, notes)
VALUES
-- Closed Cell Spray Foam (from your image - correct coverage and pricing)
('insulation','Closed Cell Spray Foam','1" (R-7/R-7.6)','sqft',1.80,0,'4400sq coverage'),
('insulation','Closed Cell Spray Foam','1.5" (R-11/R-13)','sqft',2.30,0,'2900sq coverage'),
('insulation','Closed Cell Spray Foam','2" (R-15)','sqft',2.80,0,'2200sq coverage'),
('insulation','Closed Cell Spray Foam','2.5" (R-17/R-19)','sqft',3.60,0,'1760sq coverage'),
('insulation','Closed Cell Spray Foam','2.77"/3" (R-21)','sqft',3.90,0,'1500sq coverage'),
('insulation','Closed Cell Spray Foam','4"/4.5" (R-30)','sqft',5.70,0,'1000sq coverage'),
('insulation','Closed Cell Spray Foam','5"/5.5" (R-38)','sqft',6.80,0,'850sq coverage'),
('insulation','Closed Cell Spray Foam','6.5"/7" (R-49)','sqft',8.70,0,'650sq coverage'),

-- Open Cell Spray Foam (keeping existing data)
('insulation','Open Cell Spray Foam','3.5" (R-13)','sqft',1.65,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','5.5" (R-21)','sqft',1.90,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','7" (R-27)','sqft',2.20,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','8" (R-30)','sqft',2.40,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','9" (R-34)','sqft',2.60,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','10" (R-38)','sqft',2.90,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','12" (R-45)','sqft',3.30,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','13" (R-49)','sqft',3.50,0,'Coverage varies'),
('insulation','Open Cell Spray Foam','13+" (R-50+)','sqft',3.50,0,'Coverage varies'),

-- Fiberglass Batt 
('insulation','Fiberglass Batt','3.5" (R-11/R-13)','sqft',1.60,0,'~116 sqft per bag'),
('insulation','Fiberglass Batt','3.5" (R-15)','sqft',1.70,0,'~67.8 sqft per bag'),
('insulation','Fiberglass Batt','4" (R-15)','sqft',1.90,0,'~67.8 sqft per bag'),
('insulation','Fiberglass Batt','5.5" (R-21)','sqft',1.80,0,'~77.5 sqft per bag'),
('insulation','Fiberglass Batt','6.25" (R-19)','sqft',1.50,0,'~77.5 sqft per bag'),
('insulation','Fiberglass Batt','10" (R-30)','sqft',2.00,0,'~53.33 sqft per bag'),
('insulation','Fiberglass Batt','12" (R-38)','sqft',2.20,0,'~42.67 sqft per bag'),

-- Fiberglass Faced (add your data here)
('insulation','Fiberglass Faced','3.5" (R-15)','sqft',1.75,0,'Sample coverage'),
('insulation','Fiberglass Faced','5.5" (R-21)','sqft',1.85,0,'Sample coverage');

-- Step 4: Verify the data
SELECT 
  description as "Product Type", 
  item_name as "Thickness & R-Value", 
  base_price as "Price/Sqft",
  notes as "Coverage"
FROM public.pricing_catalog 
WHERE service_type = 'insulation' 
ORDER BY description, base_price;
