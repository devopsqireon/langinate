-- Verify RLS policies for training_records table
-- Run this in Supabase SQL Editor to check if policies are properly set

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'training_records';

-- List all policies on training_records
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'training_records';

-- Test if you can insert a training record (replace 'your-course-id' with actual course ID)
-- This will show if INSERT policy is working
-- SELECT auth.uid(); -- Check your current user ID first

-- To manually test insert (after replacing the UUIDs):
-- INSERT INTO training_records (user_id, course_id, status, score, completed_at, quiz_answers)
-- VALUES (
--   auth.uid(),
--   'a1b2c3d4-e5f6-7890-1234-567890abcdef',
--   'completed',
--   85,
--   NOW(),
--   '[]'::jsonb
-- );

-- Check if data exists in training_records
SELECT
  id,
  user_id,
  course_id,
  status,
  score,
  completed_at,
  created_at
FROM training_records
ORDER BY created_at DESC
LIMIT 10;
