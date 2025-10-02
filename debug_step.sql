-- DEBUG: Check what tables exist and their structure
-- Run this to see what's currently in your database

-- Check if profiles table exists
SELECT 'Tables in public schema:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- If profiles table exists, show its structure
SELECT 'Profiles table structure (if exists):' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check jobs table structure
SELECT 'Jobs table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;