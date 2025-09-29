-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('translation', 'interpreting')),

  -- Translation-specific fields
  source_language TEXT,
  target_language TEXT,
  word_count INTEGER,
  rate_per_word DECIMAL(10,4),

  -- Interpreting-specific fields
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  duration_hours DECIMAL(5,2),
  rate_per_hour DECIMAL(10,2),

  -- Common fields
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'under_review', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- File attachments (JSON array of file metadata)
  source_files JSONB DEFAULT '[]',
  delivered_files JSONB DEFAULT '[]',

  -- Additional metadata
  notes TEXT,
  internal_notes TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_type ON jobs(user_id, type);
CREATE INDEX idx_jobs_deadline ON jobs(user_id, deadline);
CREATE INDEX idx_jobs_created_at ON jobs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate total amount
CREATE OR REPLACE FUNCTION calculate_job_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'translation' AND NEW.word_count IS NOT NULL AND NEW.rate_per_word IS NOT NULL THEN
    NEW.total_amount = NEW.word_count * NEW.rate_per_word;
  ELSIF NEW.type = 'interpreting' AND NEW.duration_hours IS NOT NULL AND NEW.rate_per_hour IS NOT NULL THEN
    NEW.total_amount = NEW.duration_hours * NEW.rate_per_hour;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate total
CREATE TRIGGER calculate_job_total_trigger
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_job_total();