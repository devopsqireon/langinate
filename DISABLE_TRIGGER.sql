-- ========================================
-- DISABLE AUTH TRIGGER
-- We're now handling user creation in application code
-- Run this in Supabase SQL Editor
-- ========================================

-- Remove all auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Auth triggers removed successfully';
  RAISE NOTICE '✓ User profiles will now be created in application code';
  RAISE NOTICE '';
  RAISE NOTICE 'Deploy your updated code and try signing up!';
END $$;
