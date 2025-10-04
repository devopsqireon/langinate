# Quick Start Guide - AI Job Import

Get the AI Job Import feature running in 5 minutes!

## Step 1: Get Your Hugging Face API Key

1. Visit [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Sign up if needed (it's free!)
3. Click "New token"
4. Name it "Langinate" and select "Read" access
5. Copy the generated token

## Step 2: Add to Environment Variables

Open your `.env.local` file and add:

```bash
HUGGING_FACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace with your actual token from Step 1.

## Step 3: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
npm run dev
```

## Step 4: Test the Feature

### Option A: From Dashboard
1. Go to `http://localhost:3000/dashboard`
2. Find the "AI Job Import" widget
3. Click "Import Job with AI"

### Option B: From Jobs Page
1. Go to `http://localhost:3000/jobs`
2. Click "AI Import" button (next to "Add Job")

## Step 5: Upload a Test Document

Create a simple text file with this content:

```
Job Request from ABC Corporation

Client: John Smith
Email: john@abccorp.com
Company: ABC Corporation

We need a translation of our website from English to Spanish.

Word count: 5,000 words
Rate: $0.12 per word
Deadline: 2025-12-31

This is an urgent project for our international expansion.
```

Save as `test-job.txt` and upload it!

## What Happens Next?

1. **Upload**: The file is uploaded
2. **AI Processing**: Hugging Face AI extracts the details (takes 10-30 seconds)
3. **Review Modal**: You'll see all extracted fields - **FULLY EDITABLE**
4. **Confirmation**: Click "Confirm & Create Job"
5. **Success**: Job is created and linked to client!

## Important Notes

- ✅ All fields are editable before saving
- ✅ Clients are automatically created if they don't exist
- ✅ Jobs start as "draft" status
- ✅ First request may take 30-60 seconds (model loading)
- ✅ Subsequent requests are much faster

## Supported File Formats

- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Text (.txt)

## Troubleshooting

**"Model is loading" error?**
- Wait 30 seconds and try again
- This only happens on the first request

**Nothing happens after upload?**
- Check browser console for errors
- Verify your API key is correct
- Make sure you restarted the dev server

**Job not appearing?**
- Refresh the page
- Check you're logged in
- Look in the Jobs page for draft jobs

## Need More Details?

See `AI_JOB_IMPORT_SETUP.md` for complete documentation.

## Quick SQL Check

If you're having database issues, run this in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'jobs');

-- Should return both 'clients' and 'jobs'
```

## Environment Variables Checklist

Make sure these are all set in `.env.local`:

```bash
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ HUGGING_FACE_API_KEY  ← NEW!
```

That's it! You're ready to use AI Job Import! 🚀
