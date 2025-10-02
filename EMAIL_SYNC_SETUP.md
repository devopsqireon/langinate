# Email Sync Setup Instructions

This guide will help you set up the email sync functionality using MailSlurp for automatic job request processing.

## Prerequisites

1. **MailSlurp Account**: Sign up at [https://www.mailslurp.com](https://www.mailslurp.com)
2. **MailSlurp API Key**: Get your API key from the MailSlurp dashboard

## Setup Steps

### 1. Configure MailSlurp API Key

1. Update your `.env.local` file with your MailSlurp API key:
   ```env
   MAILSLURP_API_KEY='your-actual-mailslurp-api-key-here'
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### 2. Database Setup

1. Run the email sync database setup in your Supabase SQL Editor:
   ```sql
   -- Copy and paste the entire content of email_sync_setup.sql
   ```

2. This will create:
   - `profiles` table with forwarding email fields
   - Email-related columns in the `jobs` table
   - RLS policies for data security
   - Triggers and indexes for performance

### 3. Webhook Configuration

The system automatically sets up webhooks when you generate an inbox. The webhook URL will be:
```
https://yourdomain.com/api/email-webhook
```

For local development, this is set to `http://localhost:3001/api/email-webhook`.

## How It Works

### 1. Generate Forwarding Email
- Users click "Generate Forwarding Email" in the Sync tab
- System creates a unique MailSlurp inbox
- Webhook is automatically configured
- Forwarding email is stored in user's profile

### 2. Email Processing Flow
1. Client sends email to the forwarding address
2. MailSlurp receives the email and triggers webhook
3. Our webhook endpoint (`/api/email-webhook`) processes the email:
   - Finds the user by forwarding email
   - Creates or finds the client from sender email
   - Creates a draft job with email content
4. Draft job appears in the Sync tab for user review

### 3. Draft Job Management
- **Review & Save**: Opens the manual job form with pre-filled data from email
- **Delete Draft**: Removes the draft job
- **Auto-client creation**: New clients are created from sender emails

## Features

### ✅ **Implemented Features**
- **Unique forwarding emails** per user via MailSlurp
- **Automatic webhook setup** for real-time email processing
- **Draft job creation** from incoming emails
- **Client auto-creation** from sender information
- **Email content preservation** (subject, body, sender)
- **Copy-to-clipboard** functionality for forwarding email
- **Draft job review** and conversion to real jobs
- **Real-time refresh** of draft jobs
- **Secure RLS policies** for data isolation

### 🔄 **Email Processing Logic**
- Extracts sender, subject, and body from emails
- Creates clients automatically if they don't exist
- Stores draft jobs with `status = 'draft'`
- Preserves email metadata for reference
- Links jobs to correct user via forwarding email lookup

### 📊 **Data Structure**
```typescript
// Draft jobs include these additional fields:
interface DraftJob {
  status: 'draft'
  email_from: string      // Sender email
  email_subject: string   // Email subject line
  email_body: string      // Email content
  received_at: Date       // When email was received
  // ... other standard job fields
}
```

## Testing

### 1. **Test Email Sending**
1. Generate a forwarding email in the Sync tab
2. Send a test email to that address from another email account
3. Check that a draft job appears in the Sync tab
4. Review and convert the draft to a proper job

### 2. **Test Webhook**
You can test the webhook directly:
```bash
curl -X POST http://localhost:3001/api/email-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "to": ["your-forwarding-email@mailslurp.com"],
      "from": "client@example.com",
      "subject": "Translation Request",
      "body": "I need a document translated from English to Spanish",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }'
```

### 3. **Check Logs**
Monitor the browser console and server logs for any errors during email processing.

## Troubleshooting

### Common Issues

1. **"No user found for forwarding email"**
   - Ensure the forwarding email was generated through the app
   - Check that the user's profile has the forwarding email stored

2. **"Failed to create email inbox"**
   - Verify your MailSlurp API key is correct
   - Check your MailSlurp account limits and billing status

3. **Emails not appearing as drafts**
   - Check MailSlurp webhook logs in your dashboard
   - Verify the webhook URL is accessible
   - Check server logs for webhook processing errors

4. **Permission denied errors**
   - Ensure RLS policies are correctly set up
   - Check that the user is properly authenticated

### Debug Commands

Check webhook endpoint:
```bash
curl http://localhost:3001/api/email-webhook
```

Check user's inbox info:
```bash
curl "http://localhost:3001/api/generate-inbox?userId=USER_ID"
```

## Production Deployment

### 1. **Environment Variables**
Set these in your production environment:
```env
MAILSLURP_API_KEY=your-production-mailslurp-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. **MailSlurp Configuration**
- Ensure your production domain is whitelisted in MailSlurp
- Configure appropriate rate limits for your usage
- Set up monitoring for webhook reliability

### 3. **Security Considerations**
- Webhook endpoint is public but validates requests
- RLS policies ensure data isolation
- Service role key is used securely for webhook operations
- Email content is stored securely in Supabase

## Future Enhancements

### Planned Features
- **AI-powered email parsing** for automatic field extraction
- **File attachment handling** for document uploads
- **Email templates** for common responses
- **Bulk email processing** for multiple job requests
- **Email threading** for job conversations
- **Custom parsing rules** per user preferences

### Integration Opportunities
- **Calendar integration** for deadline management
- **CRM sync** for client relationship management
- **Invoicing automation** based on email confirmations
- **Translation memory** integration
- **Project management** tool connections

## Support

For issues with:
- **MailSlurp integration**: Check MailSlurp documentation and support
- **Database issues**: Review Supabase logs and RLS policies
- **Webhook problems**: Monitor server logs and webhook delivery
- **General bugs**: Check browser console and server output

The email sync system is designed to be robust and handle various email formats while maintaining security and data integrity.