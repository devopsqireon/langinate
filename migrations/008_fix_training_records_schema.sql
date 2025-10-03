-- Fix training_records table schema
-- This migration ensures the table has the correct structure for the training module

-- Make course_name nullable (it was NOT NULL in the old schema)
DO $$
BEGIN
  ALTER TABLE training_records ALTER COLUMN course_name DROP NOT NULL;
END $$;

-- Add course_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_records'
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE training_records ADD COLUMN course_id UUID;

    -- Add foreign key if courses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
      ALTER TABLE training_records ADD CONSTRAINT training_records_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_records'
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE training_records ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add started_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_records'
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE training_records ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add quiz_answers column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_records'
    AND column_name = 'quiz_answers'
  ) THEN
    ALTER TABLE training_records ADD COLUMN quiz_answers JSONB DEFAULT '[]';
  END IF;
END $$;

-- Add certificate_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_records'
    AND column_name = 'certificate_url'
  ) THEN
    ALTER TABLE training_records ADD COLUMN certificate_url TEXT;
  END IF;
END $$;

-- Update status constraint to include new values
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE training_records DROP CONSTRAINT IF EXISTS training_records_status_check;

  -- Add new constraint
  ALTER TABLE training_records ADD CONSTRAINT training_records_status_check
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed', 'expired'));
END $$;

-- Ensure unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'training_records_user_id_course_id_key'
  ) THEN
    -- Only add if course_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'training_records' AND column_name = 'course_id'
    ) THEN
      ALTER TABLE training_records ADD CONSTRAINT training_records_user_id_course_id_key
        UNIQUE (user_id, course_id);
    END IF;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Training records schema fixed successfully!';
END $$;
