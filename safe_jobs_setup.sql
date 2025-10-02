-- Safe Jobs Table Setup for Jobs Module
-- This script safely creates the jobs table and related components

-- 1. Create jobs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
        CREATE TABLE jobs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL CHECK (type IN ('translation', 'interpreting')),
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'invoiced', 'paid')),

            -- Translation-specific fields
            source_lang VARCHAR(10),
            target_lang VARCHAR(10),
            word_count INTEGER,
            rate_per_word DECIMAL(8,4),

            -- Interpreting-specific fields
            hours DECIMAL(8,2),
            rate_per_hour DECIMAL(8,2),

            -- Common fields
            deadline DATE,
            description TEXT,
            notes TEXT,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Jobs table created';
    ELSE
        RAISE NOTICE 'Jobs table already exists';
    END IF;
END
$$;

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'description') THEN
        ALTER TABLE jobs ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to jobs table';
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'notes') THEN
        ALTER TABLE jobs ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to jobs table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'created_at') THEN
        ALTER TABLE jobs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to jobs table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'updated_at') THEN
        ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to jobs table';
    END IF;
END
$$;

-- 3. Enable RLS (safe to run multiple times)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies and recreate them (safe approach)
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

-- 5. Create RLS policies for jobs
CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create indexes (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);

-- 7. Create or replace trigger function (if not exists from clients setup)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Drop and recreate trigger (safe approach)
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Create or replace the jobs_with_earnings view
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

-- 10. Show current jobs table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;