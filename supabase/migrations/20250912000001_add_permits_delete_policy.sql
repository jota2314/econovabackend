-- Add missing DELETE policy for permits table
-- This fixes the issue where permits could not be deleted due to missing RLS policy
-- Problem: The permits table has SELECT, INSERT, and UPDATE policies but no DELETE policy
-- Solution: Add DELETE policy that allows users to delete permits they created, or managers to delete any

-- Policy: Users can delete permits they created, or managers can delete any
CREATE POLICY "Users can delete permits" ON permits
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'manager'
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can delete permits" ON permits IS 
'Allows users to delete permits they created, or allows managers to delete any permit';