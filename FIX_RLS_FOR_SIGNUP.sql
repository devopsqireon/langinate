-- ========================================
-- FIX RLS POLICIES FOR SIGNUP
-- Allow users to create their own profile
-- ========================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create new INSERT policy that allows users to create their own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also ensure SELECT works for own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Verify policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies updated for users table';
  RAISE NOTICE '✓ Users can now create their own profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Try signing up again!';
END $$;
