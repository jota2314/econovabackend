-- Schema Updates for Estimate/Measurement Locking System
-- Run this in your Supabase SQL Editor

-- 1. Add locking columns to measurements table
ALTER TABLE measurements 
ADD COLUMN locked_by_estimate_id UUID REFERENCES estimates(id),
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;

-- 2. Add locking columns to estimates table  
ALTER TABLE estimates
ADD COLUMN locks_measurements BOOLEAN DEFAULT FALSE,
ADD COLUMN subtotal NUMERIC DEFAULT 0,
ADD COLUMN markup_percentage NUMERIC DEFAULT 6.25;

-- 3. Create index for performance
CREATE INDEX idx_measurements_locked_by_estimate 
ON measurements(locked_by_estimate_id) 
WHERE locked_by_estimate_id IS NOT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN measurements.locked_by_estimate_id IS 'Reference to estimate that locked these measurements';
COMMENT ON COLUMN measurements.is_locked IS 'Whether measurements are locked for editing';
COMMENT ON COLUMN measurements.locked_at IS 'Timestamp when measurements were locked';
COMMENT ON COLUMN estimates.locks_measurements IS 'Whether this estimate locks related measurements';
COMMENT ON COLUMN estimates.subtotal IS 'Subtotal before markup';
COMMENT ON COLUMN estimates.markup_percentage IS 'Markup percentage applied';

-- 5. Update existing estimates to have subtotal equal to total_amount for now
UPDATE estimates 
SET subtotal = total_amount 
WHERE subtotal = 0;