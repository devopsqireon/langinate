-- STEP 6 FIXED: Update views and create functions
-- Run this after Step 5

-- Drop the existing view first, then recreate it
DROP VIEW IF EXISTS jobs_with_earnings CASCADE;

-- Recreate the jobs_with_earnings view to include email fields
CREATE VIEW jobs_with_earnings AS
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

-- Create a function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Verify the view was created correctly
SELECT 'Jobs with earnings view columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs_with_earnings'
ORDER BY ordinal_position;