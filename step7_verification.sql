-- STEP 7: Verification queries
-- Run this after Step 6 to verify everything is set up correctly

-- Check profiles table structure
SELECT 'Profiles table structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check jobs table email fields
SELECT 'Jobs table email fields:' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('email_from', 'email_subject', 'email_body', 'received_at', 'status')
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'jobs')
ORDER BY tablename, policyname;

-- Check constraints
SELECT 'Job status constraint:' as info;
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%status%';

-- Verify the view exists
SELECT 'Jobs with earnings view:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs_with_earnings'
ORDER BY ordinal_position;