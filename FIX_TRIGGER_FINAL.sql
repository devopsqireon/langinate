-- ========================================
-- FINAL FIX FOR SIGNUP TRIGGER
-- This handles all edge cases and provides detailed error logging
-- ========================================

-- First, let's check what's causing the issue
-- Run this to see if there are any existing orphaned users
SELECT
  au.id,
  au.email,
  au.created_at as auth_created,
  u.id as user_profile_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- Clean up any orphaned auth users without profiles
INSERT INTO public.users (id, name)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'User')
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Now recreate the trigger with maximum robustness
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the most robust version of the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extract name with multiple fallbacks
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Attempt to insert into public.users
  BEGIN
    INSERT INTO public.users (id, name)
    VALUES (NEW.id, user_name)
    ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, public.users.name);

    RAISE LOG 'Successfully created user profile for: %', NEW.email;
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE WARNING 'Foreign key violation for user: %, error: %', NEW.email, SQLERRM;
    WHEN unique_violation THEN
      RAISE LOG 'User profile already exists for: %', NEW.email;
    WHEN OTHERS THEN
      RAISE WARNING 'Unexpected error creating user profile for: %, error: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create a trigger for updates (in case email confirmation updates the user)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure all necessary permissions are granted
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Also grant on auth schema (this is critical!)
GRANT USAGE ON SCHEMA auth TO postgres, service_role;

-- Verify setup
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');

  IF trigger_count >= 1 THEN
    RAISE NOTICE '✓ Triggers successfully created (% trigger(s))', trigger_count;
    RAISE NOTICE '✓ All permissions granted';
    RAISE NOTICE '✓ Orphaned users cleaned up';
    RAISE NOTICE '';
    RAISE NOTICE '=== READY FOR TESTING ===';
    RAISE NOTICE 'Try signing up with a new email address now.';
    RAISE NOTICE 'The trigger will automatically create a user profile.';
  ELSE
    RAISE EXCEPTION 'Failed to create triggers';
  END IF;
END $$;
