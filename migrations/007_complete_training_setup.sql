-- =====================================================
-- COMPLETE TRAINING MODULE SETUP
-- Creates tables if not exist + inserts sample data
-- Safe to run multiple times
-- =====================================================

-- 1. Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT true,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('video', 'pdf', 'text')),
  content_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Training records table
CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  score INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  quiz_answers JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create indexes (IF NOT EXISTS not supported, so we use DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lessons_course') THEN
    CREATE INDEX idx_lessons_course ON lessons(course_id, order_index);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quiz_questions_course') THEN
    CREATE INDEX idx_quiz_questions_course ON quiz_questions(course_id, order_index);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_training_records_user') THEN
    CREATE INDEX idx_training_records_user ON training_records(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_training_records_status') THEN
    CREATE INDEX idx_training_records_status ON training_records(user_id, status);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can view own training records" ON training_records;
DROP POLICY IF EXISTS "Users can insert own training records" ON training_records;
DROP POLICY IF EXISTS "Users can update own training records" ON training_records;

-- Create RLS Policies
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view quiz questions" ON quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Users can view own training records" ON training_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training records" ON training_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training records" ON training_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Create or replace triggers
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_training_records_updated_at ON training_records;

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_records_updated_at
  BEFORE UPDATE ON training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA: Clean and insert
-- =====================================================

-- Clean existing sample data (safe to run multiple times)
DELETE FROM courses WHERE id = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

-- Insert ISO Awareness Course
INSERT INTO courses (id, title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url)
VALUES (
  'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  'ISO 17100:2015 Awareness for Translators',
  'Learn the international standard for translation services. This course covers the requirements of ISO 17100:2015, including translation processes, resources, and quality management for professional translators.',
  'quality-standards',
  'beginner',
  45,
  80,
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop'
);

-- Insert Lessons for ISO Awareness Course
INSERT INTO lessons (course_id, title, description, lesson_type, content_url, duration_minutes, order_index)
VALUES
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Introduction to ISO 17100',
    'Overview of the ISO 17100:2015 standard and its importance for translation professionals',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    10,
    1
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Translation Process Requirements',
    'Understanding the core translation process defined by ISO 17100',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    15,
    2
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Quality Management Procedures',
    'Learn about quality assurance and quality control in translation',
    'pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    10,
    3
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Resources and Competencies',
    'Professional qualifications and technical resources required',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    10,
    4
  );

-- Insert Quiz Questions for ISO Awareness Course
INSERT INTO quiz_questions (course_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_index)
VALUES
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'What is the primary purpose of ISO 17100:2015?',
    'To provide translation software requirements',
    'To establish requirements for translation services',
    'To certify individual translators',
    'To regulate translation pricing',
    'B',
    'ISO 17100:2015 specifies requirements for the core processes, resources, and other aspects necessary for the delivery of a quality translation service.',
    1
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Which of the following is a mandatory step in the ISO 17100 translation process?',
    'Marketing review',
    'Client dinner',
    'Revision by a second linguist',
    'Machine translation',
    'C',
    'ISO 17100 requires that all translations undergo revision by a linguist other than the translator.',
    2
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'What minimum qualification does ISO 17100 require for translators?',
    'High school diploma',
    'Translation degree or equivalent demonstrated competence',
    'Any bachelor degree',
    'No specific requirements',
    'B',
    'ISO 17100 requires translators to have either a recognized translation qualification or equivalent demonstrated competence through professional experience.',
    3
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'What does "revision" mean in the context of ISO 17100?',
    'Checking spelling only',
    'Bilingual examination for suitability for purpose',
    'Proofreading the target text',
    'Client review',
    'B',
    'Revision is defined as bilingual examination of target text against source text for suitability for purpose.',
    4
  ),
  (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'Which resource is NOT explicitly required by ISO 17100?',
    'Translation memory tools',
    'Reference materials',
    'Style guides',
    'Social media accounts',
    'D',
    'While ISO 17100 requires appropriate technology, reference materials, and style guides, social media accounts are not mentioned as a requirement.',
    5
  );

-- Insert additional sample courses (skip if already exist)
INSERT INTO courses (title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url)
SELECT
  'Computer-Assisted Translation (CAT) Tools Fundamentals',
  'Master the essential CAT tools used in professional translation. Learn about translation memory, terminology management, and workflow optimization.',
  'technology',
  'intermediate',
  60,
  75,
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Computer-Assisted Translation (CAT) Tools Fundamentals'
);

INSERT INTO courses (title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url)
SELECT
  'Freelance Translation Business Essentials',
  'Learn how to run a successful freelance translation business. Topics include client acquisition, pricing strategies, and financial management.',
  'business',
  'beginner',
  90,
  70,
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Freelance Translation Business Essentials'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Training module setup complete! ISO 17100 course with 4 lessons and 5 quiz questions added successfully.';
END $$;
