-- ========================================
-- FIX RLS POLICIES FOR SUBSCRIPTIONS TABLE
-- Allow users to create and manage their own subscriptions
-- ========================================

-- Drop all existing policies on subscriptions table
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.subscriptions;

-- Create new policies that allow authenticated users to manage their own subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription" ON public.subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'subscriptions';

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
WHERE tablename = 'subscriptions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies updated successfully for subscriptions table';
  RAISE NOTICE '✓ Authenticated users can now insert their own subscriptions';
  RAISE NOTICE '';
  RAISE NOTICE 'Try signing up again - trial subscription should be created!';
END $$;
