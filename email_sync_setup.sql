-- Email Sync Setup for MailSlurp Integration
-- Run this in Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    forwarding_email VARCHAR(255),
    mailslurp_inbox_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add forwarding_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'forwarding_email') THEN
        ALTER TABLE profiles ADD COLUMN forwarding_email VARCHAR(255);
        RAISE NOTICE 'Added forwarding_email column to profiles table';
    END IF;

    -- Add mailslurp_inbox_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'mailslurp_inbox_id') THEN
        ALTER TABLE profiles ADD COLUMN mailslurp_inbox_id VARCHAR(255);
        RAISE NOTICE 'Added mailslurp_inbox_id column to profiles table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to profiles table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to profiles table';
    END IF;
END
$$;

-- 3. Update jobs table status constraint to include 'draft'
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'jobs' AND constraint_name = 'jobs_status_check'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
        RAISE NOTICE 'Dropped existing jobs_status_check constraint';
    END IF;

    -- Add the new constraint with 'draft' status
    ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
        CHECK (status IN ('draft', 'pending', 'completed', 'invoiced', 'paid'));
    RAISE NOTICE 'Added new jobs_status_check constraint with draft status';
END
$$;

-- 4. Add email-related fields to jobs table for draft jobs
DO $$
BEGIN
    -- Add email_from column for storing sender email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'email_from') THEN
        ALTER TABLE jobs ADD COLUMN email_from VARCHAR(255);
        RAISE NOTICE 'Added email_from column to jobs table';
    END IF;

    -- Add email_subject column for storing email subject
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'email_subject') THEN
        ALTER TABLE jobs ADD COLUMN email_subject TEXT;
        RAISE NOTICE 'Added email_subject column to jobs table';
    END IF;

    -- Add email_body column for storing email content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'email_body') THEN
        ALTER TABLE jobs ADD COLUMN email_body TEXT;
        RAISE NOTICE 'Added email_body column to jobs table';
    END IF;

    -- Add received_at column for email timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'received_at') THEN
        ALTER TABLE jobs ADD COLUMN received_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added received_at column to jobs table';
    END IF;
END
$$;

-- 5. Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing profiles policies and create new ones
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- 7. Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_forwarding_email ON profiles(forwarding_email);
CREATE INDEX IF NOT EXISTS idx_jobs_status_draft ON jobs(status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_jobs_received_at ON jobs(received_at);

-- 9. Create or replace trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Update the jobs_with_earnings view to include email fields
CREATE OR REPLACE VIEW jobs_with_earnings AS
SELECT
    j.*,
    c.name as client_name,
    c.company as client_company,
    CASE
        WHEN j.type = 'translation' AND j.word_count IS NOT NULL AND j.rate_per_word IS NOT NULL
        THEN j.word_count * j.rate_per_word
        WHEN j.type = 'interpreting' AND j.hours IS NOT NULL AND j.rate_per_hour IS NOT NULL
        THEN j.hours * j.rate_per_hour
        ELSE 0
    END as earnings
FROM jobs j
LEFT JOIN clients c ON j.client_id = c.id;

-- 11. Create a function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- 13. Show current table structures
SELECT 'profiles table structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'jobs table email fields:' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('email_from', 'email_subject', 'email_body', 'received_at', 'status')
ORDER BY ordinal_position;