# Email Sync Setup Guide - Job Forwarding

## Overview
The Email Sync feature allows clients to send job requests directly to your unique forwarding email. These emails automatically appear as draft jobs in your system, ready to be reviewed and converted into proper jobs.

---

## ✅ What's Been Configured

1. **Ngrok URL Updated**: `https://synthia-unvillainous-anders.ngrok-free.dev`
2. **Webhook Endpoint**: `/api/email-webhook`
3. **Inbox Generator**: `/api/generate-inbox`
4. **MailSlurp Integration**: Ready to create unique forwarding emails

---

## Setup Steps

### 1. Generate Your Forwarding Email

1. **Go to Jobs Page**
   - Navigate to `/jobs` in your app
   - Click "Add Job" button
   - Click on the **"Sync"** tab

2. **Click "Generate Forwarding Email"**
   - This creates a unique MailSlurp inbox for you
   - Sets up webhook to: `https://synthia-unvillainous-anders.ngrok-free.dev/api/email-webhook`
   - Saves the forwarding email to your profile

3. **Copy Your Forwarding Email**
   - Format: `something@mailslurp.net`
   - Click the copy button to copy to clipboard
   - This is your permanent job request email address

---

## How It Works

### The Flow

Client sends email → Your forwarding email → MailSlurp receives → Webhook fires → Creates draft job → Review & Convert

### What Happens Automatically

1. **Email Received** - Client sends to your forwarding address
2. **Webhook Triggered** - MailSlurp sends to your ngrok URL
3. **Draft Job Created** - System creates job with status='draft'
4. **Review in UI** - Draft jobs appear in Sync tab

---

## Testing the Email Sync

1. **Generate Forwarding Email**: Jobs → Add Job → Sync → Generate
2. **Send Test Email**: From any email to your forwarding address
3. **Check Draft Jobs**: Jobs → Add Job → Sync → Refresh
4. **Review**: Click "Review & Save" on draft job
5. **Convert**: Fill in details and create job

---

## Important: Ngrok URL

⚠️ Your ngrok URL is: `https://synthia-unvillainous-anders.ngrok-free.dev`

**Keep ngrok running!** If you restart ngrok:
- URL will change
- Update `.env.local` with new URL
- Restart dev server
- Re-generate forwarding email

**For Production**: Deploy to Vercel/Railway with permanent domain, no ngrok needed!

---

## Summary

✅ **Ready to use!**
1. Go to Jobs → Add Job → Sync
2. Click "Generate Forwarding Email"
3. Test by sending an email
4. Watch it appear as draft job
5. Review and convert to real job

🎉 Your email sync is configured and ready!
