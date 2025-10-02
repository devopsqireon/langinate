-- Jobs Module SQL Setup for Supabase
-- This file contains all the SQL queries needed to set up the jobs functionality

-- 1. Create clients table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
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

    -- File uploads (will store file paths from Supabase Storage)
    uploaded_files JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints to ensure proper data based on type
    CONSTRAINT translation_fields_check
        CHECK (
            (type = 'translation' AND source_lang IS NOT NULL AND target_lang IS NOT NULL AND word_count IS NOT NULL AND rate_per_word IS NOT NULL)
            OR
            (type = 'interpreting' AND hours IS NOT NULL AND rate_per_hour IS NOT NULL)
        )
);

-- 3. Create function to calculate earnings
CREATE OR REPLACE FUNCTION calculate_job_earnings(job_record jobs)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF job_record.type = 'translation' THEN
        RETURN job_record.word_count * job_record.rate_per_word;
    ELSIF job_record.type = 'interpreting' THEN
        RETURN job_record.hours * job_record.rate_per_hour;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for clients table
CREATE POLICY "Users can view their own clients" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for jobs table
CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);

-- 10. Insert sample data (optional - remove in production)
-- Sample client
INSERT INTO clients (user_id, name, email, company) VALUES
    (auth.uid(), 'Sample Client', 'client@example.com', 'Sample Company')
ON CONFLICT DO NOTHING;

-- Note: You'll need to run this after authentication is set up and you have a user_id
-- To get the client_id for sample job, run: SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1;

-- 11. Create a view for jobs with calculated earnings
CREATE OR REPLACE VIEW jobs_with_earnings AS
SELECT
    j.*,
    c.name as client_name,
    c.company as client_company,
    CASE
        WHEN j.type = 'translation' THEN j.word_count * j.rate_per_word
        WHEN j.type = 'interpreting' THEN j.hours * j.rate_per_hour
        ELSE 0
    END as earnings
FROM jobs j
LEFT JOIN clients c ON j.client_id = c.id;

-- 12. Create storage bucket for job files (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-files', 'job-files', false);

-- 13. Create storage policies for job files
-- Note: These policies assume the bucket 'job-files' exists
-- CREATE POLICY "Users can upload their own job files" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'job-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own job files" ON storage.objects
--     FOR SELECT USING (bucket_id = 'job-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own job files" ON storage.objects
--     FOR DELETE USING (bucket_id = 'job-files' AND auth.uid()::text = (storage.foldername(name))[1]);