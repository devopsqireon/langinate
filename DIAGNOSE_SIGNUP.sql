-- ========================================
-- DIAGNOSTIC QUERY FOR SIGNUP ISSUE
-- Run this in Supabase SQL Editor to check setup
-- ========================================

-- 1. Check if users table exists
SELECT
  'users table exists' as check_name,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users'
  ) as result;

-- 2. Check if trigger function exists
SELECT
  'handle_new_user function exists' as check_name,
  EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) as result;

-- 3. Check if trigger is attached
SELECT
  'on_auth_user_created trigger exists' as check_name,
  EXISTS (
    SELECT FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) as result;

-- 4. Check trigger details
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  CASE t.tgtype::integer & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as trigger_level,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as trigger_timing
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 5. Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Test the function manually (this simulates what happens during signup)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- This is what the trigger should do
  RAISE NOTICE 'Testing with user ID: %', test_user_id;

  -- Try to insert a test user
  BEGIN
    INSERT INTO public.users (id, name)
    VALUES (test_user_id, 'Test User')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'SUCCESS: Test user created in public.users table';

    -- Clean up test data
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE 'Test data cleaned up';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
  END;
END $$;

-- 7. Check RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
