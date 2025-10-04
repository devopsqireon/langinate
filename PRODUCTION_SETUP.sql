-- ========================================
-- PRODUCTION SUPABASE SETUP FOR LANGINATE
-- Run this in your Supabase SQL Editor
-- ========================================

-- 1. CREATE USERS/PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'translator' CHECK (role IN ('translator', 'interpreter', 'both')),
  default_currency TEXT DEFAULT 'USD' CHECK (default_currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
  phone TEXT,
  company_name TEXT,
  bio TEXT,
  specializations TEXT[],
  languages TEXT[],
  default_rate_per_word DECIMAL(10,4) DEFAULT 0.15,
  default_rate_per_hour DECIMAL(10,2) DEFAULT 75.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create RLS policies for users
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. CREATE AUTO-PROFILE TRIGGER
-- ========================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. CREATE PROFILES TABLE (for email forwarding feature)
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  forwarding_email TEXT,
  mailslurp_inbox_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile data" ON public.profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile data" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile data" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile data" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. CREATE CLIENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  company_name TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

-- Create RLS policies for clients
CREATE POLICY "Users can view own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- 5. CREATE JOBS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('translation', 'interpreting')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled')),
  description TEXT,

  -- Translation specific
  source_lang TEXT,
  target_lang TEXT,
  word_count INTEGER,
  rate_per_word DECIMAL(10,4),

  -- Interpreting specific
  hours DECIMAL(10,2),
  rate_per_hour DECIMAL(10,2),

  -- Email sync fields
  email_from TEXT,
  email_subject TEXT,
  email_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE,

  -- Common fields
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email_message_id column if it doesn't exist (for email sync feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'jobs'
    AND column_name = 'email_message_id'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN email_message_id TEXT;
  END IF;
END $$;

-- Enable RLS on jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;

-- Create RLS policies for jobs
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = user_id);

-- 6. CREATE INVOICES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Financial
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,

  -- Details
  job_ids UUID[],
  line_items JSONB,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, invoice_number)
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

-- Create RLS policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING (auth.uid() = user_id);

-- 7. CREATE SUBSCRIPTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Paddle IDs
  paddle_subscription_id TEXT UNIQUE,
  paddle_customer_id TEXT,
  paddle_price_id TEXT,
  paddle_product_id TEXT,

  -- Subscription details
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  plan_name TEXT DEFAULT 'free',

  -- Billing
  currency TEXT DEFAULT 'USD',
  amount DECIMAL(10,2),
  interval TEXT CHECK (interval IN ('month', 'year')),

  -- Dates
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. CREATE PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- Paddle IDs
  paddle_payment_id TEXT UNIQUE,
  paddle_transaction_id TEXT,
  paddle_invoice_id TEXT,

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Dates
  paid_at TIMESTAMP WITH TIME ZONE,

  -- URLs
  invoice_url TEXT,
  receipt_url TEXT,

  -- Additional info
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

-- Create RLS policies for payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- 9. CREATE UPDATED_AT TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_email_message_id ON public.jobs(email_message_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_forwarding_email ON public.profiles(forwarding_email);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Production database setup completed successfully!';
  RAISE NOTICE '✓ All tables, triggers, and RLS policies are in place.';
  RAISE NOTICE '✓ User signup should now work correctly.';
END $$;
