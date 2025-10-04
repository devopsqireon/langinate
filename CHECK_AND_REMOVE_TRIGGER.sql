-- ========================================
-- CHECK AND COMPLETELY REMOVE ALL TRIGGERS
-- Run this in Supabase SQL Editor
-- ========================================

-- First, let's see what triggers exist
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users';

-- Check if there are any triggers on auth.users
SELECT
  t.tgname as trigger_name,
  n.nspname || '.' || c.relname as table_name,
  p.proname as function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND NOT t.tgisinternal;

-- Remove ALL triggers on auth.users
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_record.tgname);
    RAISE NOTICE 'Dropped trigger: %', trigger_record.tgname;
  END LOOP;
END $$;

-- Remove all related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Verify cleanup
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND NOT t.tgisinternal;

  IF trigger_count = 0 THEN
    RAISE NOTICE '✓ All triggers successfully removed from auth.users';
    RAISE NOTICE '✓ User profiles will now be created in application code only';
    RAISE NOTICE '';
    RAISE NOTICE '=== READY FOR TESTING ===';
    RAISE NOTICE 'Try signing up again - it should work now!';
  ELSE
    RAISE WARNING 'Still % trigger(s) remaining on auth.users', trigger_count;
  END IF;
END $$;
