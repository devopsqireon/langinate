-- STEP 5: Create indexes and triggers
-- Run this after Step 4

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_forwarding_email ON profiles(forwarding_email);
CREATE INDEX IF NOT EXISTS idx_jobs_status_draft ON jobs(status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_jobs_received_at ON jobs(received_at);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();