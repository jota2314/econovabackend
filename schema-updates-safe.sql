-- Safe Schema Updates - Only add columns that don't exist
-- Run this in your Supabase SQL Editor

-- Add locking columns to measurements table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='locked_by_estimate_id') THEN
        ALTER TABLE measurements ADD COLUMN locked_by_estimate_id UUID REFERENCES estimates(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='is_locked') THEN
        ALTER TABLE measurements ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='measurements' AND column_name='locked_at') THEN
        ALTER TABLE measurements ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add locking columns to estimates table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='locks_measurements') THEN
        ALTER TABLE estimates ADD COLUMN locks_measurements BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='markup_percentage') THEN
        ALTER TABLE estimates ADD COLUMN markup_percentage NUMERIC DEFAULT 6.25;
    END IF;
END $$;

-- Create index for performance (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_measurements_locked_by_estimate') THEN
        CREATE INDEX idx_measurements_locked_by_estimate 
        ON measurements(locked_by_estimate_id) 
        WHERE locked_by_estimate_id IS NOT NULL;
    END IF;
END $$;

-- Update existing estimates to have markup_percentage if not set
UPDATE estimates 
SET markup_percentage = 6.25 
WHERE markup_percentage IS NULL OR markup_percentage = 0;