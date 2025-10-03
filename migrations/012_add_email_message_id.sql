-- Add email_message_id column to jobs table to track which emails have been processed
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS email_message_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_email_message_id ON jobs(email_message_id);

-- Add comment
COMMENT ON COLUMN jobs.email_message_id IS 'MailSlurp message ID to prevent duplicate processing';
