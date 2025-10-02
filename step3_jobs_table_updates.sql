-- STEP 3: Update jobs table for email sync
-- Run this after Step 2

-- First, update the status constraint to include 'draft'
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