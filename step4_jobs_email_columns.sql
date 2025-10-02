-- STEP 4: Add email-related columns to jobs table
-- Run this after Step 3

-- Add email-related fields to jobs table for draft jobs
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