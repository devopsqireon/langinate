-- =====================================================
-- SAMPLE DATA ONLY: ISO Awareness Course
-- Run this if tables already exist
-- =====================================================

-- First, check if the course already exists and delete if needed
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

-- Insert additional sample courses
INSERT INTO courses (title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url)
VALUES
  (
    'Computer-Assisted Translation (CAT) Tools Fundamentals',
    'Master the essential CAT tools used in professional translation. Learn about translation memory, terminology management, and workflow optimization.',
    'technology',
    'intermediate',
    60,
    75,
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop'
  ),
  (
    'Freelance Translation Business Essentials',
    'Learn how to run a successful freelance translation business. Topics include client acquisition, pricing strategies, and financial management.',
    'business',
    'beginner',
    90,
    70,
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop'
  );
