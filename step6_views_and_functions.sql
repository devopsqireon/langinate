-- STEP 6: Update views and create functions
-- Run this after Step 5

-- Update the jobs_with_earnings view to include email fields
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

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();