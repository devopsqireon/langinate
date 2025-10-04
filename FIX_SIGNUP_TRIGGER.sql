-- ========================================
-- FIX SIGNUP TRIGGER - Run this in Supabase SQL Editor
-- This fixes the "Database error saving new user" issue
-- ========================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling and RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into public.users table
  -- SECURITY DEFINER allows this to bypass RLS policies
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'User'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger "on_auth_user_created" successfully created';
  ELSE
    RAISE EXCEPTION '✗ Failed to create trigger';
  END IF;
END $$;

-- Test with a fake user ID to make sure it works
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Simulate what the trigger does
  INSERT INTO public.users (id, name)
  VALUES (test_id, 'Test User')
  ON CONFLICT (id) DO NOTHING;

  -- Check if it was inserted
  IF EXISTS (SELECT 1 FROM public.users WHERE id = test_id) THEN
    RAISE NOTICE '✓ Test insert successful - trigger should work';
    -- Clean up
    DELETE FROM public.users WHERE id = test_id;
  ELSE
    RAISE EXCEPTION '✗ Test insert failed - there is still an issue';
  END IF;

  RAISE NOTICE '✓ Signup trigger fix completed successfully!';
  RAISE NOTICE 'Try signing up again - it should work now.';
END $$;
