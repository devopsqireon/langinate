-- Create training_records table
CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Course details
  course_name TEXT NOT NULL,
  course_provider TEXT,
  course_description TEXT,
  course_type TEXT DEFAULT 'certification' CHECK (course_type IN ('certification', 'course', 'workshop', 'webinar', 'conference')),

  -- Status and completion
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed', 'expired')),
  start_date DATE,
  completion_date DATE,
  expiry_date DATE,

  -- Assessment details
  score DECIMAL(5,2), -- e.g., 85.5 for 85.5%
  passing_score DECIMAL(5,2),
  attempts INTEGER DEFAULT 0,

  -- Certificates and documents
  certificate_url TEXT,
  certificate_number TEXT,
  certificate_file_name TEXT,

  -- Additional metadata
  duration_hours DECIMAL(5,2),
  credits DECIMAL(5,2),
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),

  -- Categories and tags
  category TEXT, -- e.g., 'ISO Standards', 'Medical Translation', 'Legal Interpretation'
  tags TEXT[], -- e.g., ['ISO 17100', 'Quality Assurance', 'Translation']

  -- Notes
  notes TEXT,
  instructor_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_training_records_user_id ON training_records(user_id);
CREATE INDEX idx_training_records_status ON training_records(user_id, status);
CREATE INDEX idx_training_records_completion_date ON training_records(user_id, completion_date DESC);
CREATE INDEX idx_training_records_expiry_date ON training_records(user_id, expiry_date);
CREATE INDEX idx_training_records_category ON training_records(user_id, category);

-- Enable RLS
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own training records" ON training_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training records" ON training_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training records" ON training_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training records" ON training_records
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_training_records_updated_at
  BEFORE UPDATE ON training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update status based on dates and scores
CREATE OR REPLACE FUNCTION update_training_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as expired if past expiry date
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE AND NEW.status = 'completed' THEN
    NEW.status = 'expired';
  END IF;

  -- Mark as completed if completion date is set and score meets requirements
  IF NEW.completion_date IS NOT NULL AND NEW.status IN ('not_started', 'in_progress') THEN
    IF NEW.score IS NOT NULL AND NEW.passing_score IS NOT NULL THEN
      IF NEW.score >= NEW.passing_score THEN
        NEW.status = 'completed';
      ELSE
        NEW.status = 'failed';
      END IF;
    ELSE
      NEW.status = 'completed';
    END IF;
  END IF;

  -- Mark as in_progress if start date is set but not completed
  IF NEW.start_date IS NOT NULL AND NEW.completion_date IS NULL AND NEW.status = 'not_started' THEN
    NEW.status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update status
CREATE TRIGGER update_training_status_trigger
  BEFORE INSERT OR UPDATE ON training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_training_status();