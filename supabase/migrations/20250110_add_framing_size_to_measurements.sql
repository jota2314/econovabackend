-- Add framing_size column to measurements table
-- This stores the structural framing size (2x4, 2x6, 2x8, 2x10, 2x12) for each measurement
-- Previously this data was only in the UI and lost between sessions

ALTER TABLE measurements
ADD COLUMN IF NOT EXISTS framing_size text
CHECK (framing_size IN ('2x4', '2x6', '2x8', '2x10', '2x12'));

-- Add comment for documentation
COMMENT ON COLUMN measurements.framing_size IS 'Structural framing size used for insulation calculation (2x4, 2x6, 2x8, 2x10, 2x12). Critical for hybrid system R-value calculations.';

-- Create index for faster queries when grouping by framing_size
CREATE INDEX IF NOT EXISTS idx_measurements_framing_size ON measurements(framing_size);

-- Backfill existing measurements with default framing size from job.structural_framing
UPDATE measurements m
SET framing_size = COALESCE(
  (SELECT structural_framing FROM jobs j WHERE j.id = m.job_id),
  '2x6'  -- Default fallback if job has no structural_framing set
)
WHERE framing_size IS NULL;
