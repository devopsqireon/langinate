-- ========================================
-- FIX RLS POLICY FOR USER SIGNUP
-- Error: "new row violates row-level security policy for table users"
-- ========================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

-- Create new policies that allow authenticated users to manage their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE
  USING (auth.uid() = id);

-- Verify RLS is enabled but policies allow self-insertion
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- Show all policies
SELECT
  policyname,
  cmd,
  roles::text[],
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'users';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies updated successfully';
  RAISE NOTICE '✓ Authenticated users can now insert their own profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Try signing up again - it should work now!';
END $$;
