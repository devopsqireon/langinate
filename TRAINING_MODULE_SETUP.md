# Training Module - Setup Instructions

## Overview
The Training Module allows users to:
- Browse and enroll in professional courses
- Watch video lessons and read PDF materials
- Take quizzes to test knowledge
- Earn and download certificates upon passing
- Track training progress

## Database Setup

### Step 1: Run the SQL Migration

Copy and paste the entire contents of `migrations/005_create_training_module.sql` into your Supabase SQL Editor and execute it.

This will create:
- **courses** table - Stores training courses
- **lessons** table - Course content (videos/PDFs)
- **quiz_questions** table - Quiz questions for each course
- **training_records** table - User progress and certificates

### Step 2: Verify Sample Data

The migration includes sample data for:
1. **ISO 17100:2015 Awareness for Translators** (fully configured with lessons and quiz)
2. **CAT Tools Fundamentals** (placeholder)
3. **Freelance Translation Business Essentials** (placeholder)

## Features Implemented

### 1. Training Courses List (`/training`)
- **Beautiful card grid** displaying all available courses
- **Course thumbnails** with completion status badges
- **Stats cards** showing completed courses, in-progress courses
- **Difficulty badges** (Beginner, Intermediate, Advanced)
- **Category icons** (Quality Standards, Technology, Business)
- **Progress tracking** with scores displayed for completed courses

### 2. Course Details Page (`/training/[id]`)
- **Course overview** with title, description, and metadata
- **Lessons list** with video/PDF indicators
- **Lesson viewer** that opens content in new tabs
- **Mark as complete** functionality for lessons
- **Quiz section** with start button and requirements

### 3. Interactive Quiz Modal
- **Progressive question flow** (one question at a time)
- **Progress bar** showing quiz completion
- **Radio button selection** for answers
- **Automatic grading** with passing threshold
- **Results screen** with score and certificate access
- **Retake functionality** for failed attempts

### 4. Certificate Generation
- **Automated certificate** creation upon passing quiz
- **Professional PDF format** with course details
- **Download functionality** using browser print dialog
- **Score and completion date** included
- **Print-optimized layout** with decorative borders

### 5. Training Records
- **Automatic tracking** of user progress
- **Score persistence** in database
- **Quiz answers storage** for review
- **Completion timestamps**
- **Status management** (in_progress, completed, failed)

## Sample Data Details

### ISO 17100 Course Includes:

**4 Lessons:**
1. Introduction to ISO 17100 (Video, 10 min)
2. Translation Process Requirements (Video, 15 min)
3. Quality Management Procedures (PDF, 10 min)
4. Resources and Competencies (Video, 10 min)

**5 Quiz Questions:**
- Purpose of ISO 17100
- Mandatory translation process steps
- Translator qualifications
- Revision definition
- Required resources

**Sample URLs Used:**
- Video: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- PDF: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
- Thumbnail: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3`

## How to Use

### As a User:
1. Navigate to **Training** in the sidebar
2. Browse available courses
3. Click **Start Course** on any course card
4. Review lessons by clicking on each lesson card
5. Open videos/PDFs in new tabs
6. Mark lessons as complete
7. Click **Start Quiz** when ready
8. Answer all quiz questions
9. If you pass (≥80%), download your certificate
10. View completed courses with scores on the training page

### Adding New Courses:

```sql
-- Insert a new course
INSERT INTO courses (title, description, category, difficulty, duration_minutes, passing_score, thumbnail_url)
VALUES (
  'Your Course Title',
  'Course description here',
  'technology', -- or 'quality-standards', 'business'
  'intermediate', -- or 'beginner', 'advanced'
  60,
  75, -- passing score percentage
  'https://your-image-url.com/image.jpg'
);

-- Get the course ID from the insert result, then add lessons
INSERT INTO lessons (course_id, title, description, lesson_type, content_url, duration_minutes, order_index)
VALUES
  ('course-id-here', 'Lesson Title', 'Lesson description', 'video', 'https://video-url', 15, 1),
  ('course-id-here', 'Lesson 2', 'Description', 'pdf', 'https://pdf-url', 10, 2);

-- Add quiz questions
INSERT INTO quiz_questions (course_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, order_index)
VALUES
  ('course-id-here', 'Question text?', 'Option A', 'Option B', 'Option C', 'Option D', 'B', 'Explanation why B is correct', 1);
```

## Extensibility

The training module is designed to be easily extended:

### Add New Categories
Update the category icons in `/training/page.tsx`:
```typescript
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "your-category":
      return <YourIcon className="h-5 w-5" />
    // ...
  }
}
```

### Add New Lesson Types
Currently supports: `video`, `pdf`, `text`

To add more types, update the lesson viewer in `/training/[id]/page.tsx`

### Add Video Embeds
Replace the link-based viewer with iframe embeds:
```typescript
{selectedLesson.lesson_type === "video" && (
  <iframe
    src={selectedLesson.content_url}
    className="w-full aspect-video"
    allowFullScreen
  />
)}
```

### Enhanced Certificates
The certificate generation can be enhanced by:
- Adding user names from profiles
- Including instructor signatures
- Adding QR codes for verification
- Storing as actual PDFs in Supabase Storage

## Testing

1. **Run SQL Migration**: Execute `migrations/005_create_training_module.sql`
2. **Navigate to Training**: Go to `/training` in your app
3. **Start ISO Course**: Click "Start Course" on ISO 17100
4. **Complete Lessons**: Click through and mark lessons complete
5. **Take Quiz**: Start the quiz and answer questions
6. **Get Certificate**: Pass with 80%+ and download certificate

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Users can only view their own training records
- Courses and lessons are publicly viewable
- Quiz answers are stored securely per user
- Certificates can only be generated after passing

## Database Schema Summary

```
courses
├── id (UUID)
├── title, description
├── category, difficulty
├── duration_minutes, passing_score
├── thumbnail_url
└── is_published

lessons
├── id (UUID)
├── course_id (FK → courses)
├── title, description
├── lesson_type (video/pdf/text)
├── content_url
├── duration_minutes
└── order_index

quiz_questions
├── id (UUID)
├── course_id (FK → courses)
├── question_text
├── option_a, option_b, option_c, option_d
├── correct_answer (A/B/C/D)
├── explanation
└── order_index

training_records
├── id (UUID)
├── user_id (FK → users)
├── course_id (FK → courses)
├── status (in_progress/completed/failed)
├── score (percentage)
├── completed_at
├── certificate_url
└── quiz_answers (JSONB)
```

## Next Steps

1. Add more courses by inserting data into the courses, lessons, and quiz_questions tables
2. Customize certificate design in the `handleDownloadCertificate` function
3. Add video embed support for better user experience
4. Implement certificate verification system
5. Add user profile section to view all earned certificates
6. Create admin panel to manage courses

## Support

For issues or questions:
- Check Supabase logs for database errors
- Verify RLS policies are correctly set
- Ensure user is authenticated before taking quizzes
- Check browser console for frontend errors
