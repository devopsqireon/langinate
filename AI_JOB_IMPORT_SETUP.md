# AI Job Import Feature - Setup Guide

This guide will help you set up the AI Job Import feature for your Langinate translation SaaS application.

## Features

The AI Job Import feature allows users to:
1. Upload job request documents (PDF, Word, Excel, or text files)
2. Automatically extract job and client details using AI (Hugging Face Mistral-7B model)
3. Review and edit all parsed information in a user-friendly modal
4. Automatically create or link clients in the database
5. Save the job to Supabase with all details

## Architecture

### Components Created

1. **`/src/components/ai-job-import.tsx`** - Reusable modal component that can be called from anywhere
2. **`/src/app/api/ai-parse-job/route.ts`** - API endpoint for AI parsing using Hugging Face
3. **`/src/app/api/save-job/route.ts`** - API endpoint for saving jobs to Supabase
4. **Integration in Dashboard** - Widget on main dashboard for quick access
5. **Integration in Jobs Page** - "AI Import" button next to "Add Job"

### Database Tables Used

- **`clients`** - Stores client information
- **`jobs`** - Stores job information with type-specific fields

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Hugging Face API Configuration
HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
```

#### How to Get Your Hugging Face API Key:

1. Go to [https://huggingface.co](https://huggingface.co)
2. Sign up for a free account (if you don't have one)
3. Navigate to your profile settings: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. Click "New token"
5. Give it a name (e.g., "Langinate AI Import")
6. Select "Read" access (this is sufficient for inference)
7. Click "Generate token"
8. Copy the token and add it to your `.env.local` file

**Note:** The Hugging Face Inference API has a generous free tier that should be sufficient for most use cases.

### 2. Supabase Configuration

The feature uses your existing Supabase configuration. Make sure these environment variables are already set in your `.env.local`:

```bash
# Supabase Configuration (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Database Schema

The feature uses your existing database tables. Ensure these migrations have been run:

- `002_create_clients_table.sql`
- `003_create_jobs_table.sql`

These should already be in place if your app is working.

### 4. Install Dependencies

All required dependencies should already be installed. If you encounter any issues, run:

```bash
npm install
```

## Usage

### From Dashboard

1. Navigate to the dashboard
2. Look for the "AI Job Import" widget (highlighted with dashed border)
3. Click "Import Job with AI" button
4. Upload a document containing job details
5. Click "Parse Document"
6. Review and edit the extracted information
7. Click "Confirm & Create Job"

### From Jobs Page

1. Navigate to the Jobs page
2. Click the "AI Import" button (next to "Add Job")
3. Follow the same steps as above

## How It Works

### Workflow

1. **Upload**: User uploads a document (PDF, Word, Excel, or text file)
2. **Parse**: Document text is sent to Hugging Face Mistral-7B-Instruct model
3. **Extract**: AI extracts structured JSON with client and job details
4. **Review**: User sees a modal with all fields editable:
   - Client information (name, email, company)
   - Job type (translation or interpreting)
   - Job details (title, description, deadline)
   - Type-specific fields (languages, word count, rates, etc.)
5. **Save**: On confirmation:
   - Checks if client exists (by name)
   - Creates new client if doesn't exist
   - Creates job linked to client
   - Sets job status to "draft" for AI-imported jobs

### AI Prompt

The AI is prompted to extract:
- Client name, email, and company
- Job type (translation or interpreting)
- Job title and description
- Language pairs (for translation)
- Word count and rate per word (for translation)
- Duration and hourly rate (for interpreting)
- Deadline
- Additional notes

### Data Validation

- All fields are editable in the review modal
- Client name is required
- Job type must be "translation" or "interpreting"
- Type-specific fields are validated based on job type
- Email addresses are validated
- Numbers are properly parsed and validated

## API Endpoints

### POST `/api/ai-parse-job`

**Request:**
```json
{
  "text": "string - content of the uploaded document"
}
```

**Response:**
```json
{
  "data": {
    "client_name": "string",
    "client_email": "string",
    "client_company": "string",
    "type": "translation" | "interpreting",
    "title": "string",
    "description": "string",
    "source_language": "string",
    "target_language": "string",
    "word_count": number,
    "rate_per_word": number,
    "duration_hours": number,
    "rate_per_hour": number,
    "deadline": "YYYY-MM-DD",
    "notes": "string"
  }
}
```

### POST `/api/save-job`

**Request:**
```json
{
  "client_name": "string",
  "client_email": "string",
  "client_company": "string",
  "type": "translation" | "interpreting",
  "title": "string",
  "description": "string",
  "source_language": "string",
  "target_language": "string",
  "word_count": number,
  "rate_per_word": number,
  "duration_hours": number,
  "rate_per_hour": number,
  "deadline": "YYYY-MM-DD",
  "notes": "string"
}
```

**Response:**
```json
{
  "success": true,
  "job": { /* job object */ },
  "message": "Job created successfully"
}
```

## Error Handling

The feature includes comprehensive error handling:

1. **Model Loading**: If the AI model is loading, users get a friendly message to wait 30 seconds
2. **Parse Failures**: If AI parsing fails, fallback data is provided with a warning
3. **Database Errors**: Clear error messages for database operations
4. **Validation Errors**: Form validation with inline error messages
5. **Authentication**: Proper checks for user authentication

## Troubleshooting

### "AI model is loading" error
- This is normal for the first request or after inactivity
- Wait 30-60 seconds and try again
- The model will stay "warm" after the first successful request

### "Failed to parse job" error
- Check that your Hugging Face API key is correct
- Ensure the document has readable text
- Try uploading a different format (e.g., text instead of PDF)

### Jobs not appearing after creation
- Refresh the page
- Check that you're logged in
- Verify the job was created in Supabase dashboard

### Client not being created
- Check Supabase RLS policies for the clients table
- Verify your authentication is working
- Check browser console for detailed errors

## SQL Schema Reference

### Clients Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Jobs Table
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('translation', 'interpreting')),
  title TEXT NOT NULL,
  description TEXT,
  source_language TEXT,
  target_language TEXT,
  word_count INTEGER,
  rate_per_word DECIMAL(10,4),
  duration_hours DECIMAL(5,2),
  rate_per_hour DECIMAL(10,2),
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Future Enhancements

Potential improvements for this feature:

1. **Multiple File Upload**: Support uploading multiple documents at once
2. **OCR Integration**: Better handling of scanned PDFs and images
3. **Batch Import**: Import multiple jobs from a single document
4. **Custom AI Models**: Fine-tune a model specifically for your job formats
5. **Template Recognition**: Learn from previous imports to improve accuracy
6. **Confidence Scores**: Show confidence levels for each extracted field
7. **Email Integration**: Parse job requests directly from emails

## Support

For issues or questions:
- Check the browser console for detailed error messages
- Verify all environment variables are set correctly
- Ensure Supabase tables and RLS policies are configured
- Check Hugging Face API status at [status.huggingface.co](https://status.huggingface.co)

## License

This feature is part of the Langinate translation SaaS application.
