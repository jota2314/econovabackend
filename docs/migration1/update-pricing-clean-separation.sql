-- Update pricing catalog with properly separated description and item_name
-- Step 1: Clear existing data
DELETE FROM public.pricing_catalog WHERE service_type = 'insulation';

-- Step 2: Insert new data with clean separation
-- Description contains ONLY the product type (e.g., "Closed Cell Spray Foam")
-- Item_name contains ONLY the thickness and R-value (e.g., "1.5" (R-11/13)")

INSERT INTO public.pricing_catalog (service_type, description, item_name, unit, base_price, markup_percentage)
VALUES
-- Closed Cell Spray Foam
('insulation','Closed Cell Spray Foam','1" (R-7)','sqft',1.80,0),
('insulation','Closed Cell Spray Foam','1.5" (R-11/13)','sqft',2.30,0),
('insulation','Closed Cell Spray Foam','2" (R-15)','sqft',2.80,0),
('insulation','Closed Cell Spray Foam','2.5" (R-17/19)','sqft',3.60,0),
('insulation','Closed Cell Spray Foam','3" (R-21)','sqft',3.90,0),
('insulation','Closed Cell Spray Foam','4" (R-30)','sqft',5.70,0),
('insulation','Closed Cell Spray Foam','5" (R-38)','sqft',6.80,0),
('insulation','Closed Cell Spray Foam','6.5–7" (R-49)','sqft',8.70,0),

-- Open Cell Spray Foam
('insulation','Open Cell Spray Foam','3.5" (R-13)','sqft',1.65,0),
('insulation','Open Cell Spray Foam','5.5" (R-21)','sqft',1.90,0),
('insulation','Open Cell Spray Foam','7" (R-27)','sqft',2.20,0),
('insulation','Open Cell Spray Foam','8" (R-30)','sqft',2.40,0),
('insulation','Open Cell Spray Foam','9" (R-34)','sqft',2.60,0),
('insulation','Open Cell Spray Foam','10" (R-38)','sqft',2.90,0),
('insulation','Open Cell Spray Foam','12" (R-45)','sqft',3.30,0),
('insulation','Open Cell Spray Foam','13" (R-49)','sqft',3.50,0),
('insulation','Open Cell Spray Foam','13+" (R-50+)','sqft',3.50,0);

-- Step 3: Verify the clean separation
SELECT 
  description as "Product Type", 
  item_name as "Thickness & R-Value", 
  base_price as "Price/Sqft"
FROM public.pricing_catalog 
WHERE service_type = 'insulation' 
ORDER BY description, base_price;
