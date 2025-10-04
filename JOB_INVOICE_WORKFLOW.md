# Job-to-Invoice Workflow - UX Improvement

## Overview
Seamless integration between Jobs and Invoices with one-click invoice generation from completed jobs.

## Features Added

### 1. Generate Invoice Button on Job Details Page

**Location**: `/jobs/[id]` - Job Details Page

**Visibility Conditions**:
- Shows when job status is `completed`, OR
- Shows when job has earnings > 0 and is not already `invoiced` or `paid`

**Functionality**:
- Automatically checks if job is completed
- If not completed, prompts user to mark as completed first
- Validates that job has earnings calculated
- Generates unique invoice number (format: `INV-YYYYMMDD-XXX`)
- Creates invoice with job data pre-filled
- Links invoice to job via `job_ids` array
- Updates job status to `invoiced`
- Redirects user to the new invoice

### 2. Generate Invoice in Jobs List

**Location**: `/jobs` - Jobs List Page

**Access**: Via dropdown menu (three dots) on each job row

**Visibility**: Same conditions as job details page
- Shows for completed jobs
- Shows for jobs with earnings that aren't already invoiced

### 3. Smart Invoice Generation

**What Gets Auto-Filled**:
```javascript
{
  invoice_number: "INV-20251004-001", // Auto-generated
  client_id: job.client_id,           // Linked to same client
  title: "Invoice for Translation/Interpreting Services",
  description: job.description,
  job_ids: [jobId],                   // Linked to source job
  subtotal: job.earnings,
  total_amount: job.earnings,
  issue_date: today,
  due_date: today + 30 days,          // Default 30-day payment terms
  status: 'draft',                     // Start as draft for review
  line_items: [{
    description: "Translation Service (EN → ES)",
    quantity: word_count or hours,
    unit_price: rate_per_word or rate_per_hour,
    amount: earnings
  }],
  notes: "Generated from Job ID: xxx"
}
```

### 4. Job Status Flow

```
draft → pending → completed → invoiced → paid
                      ↓
               [Generate Invoice]
                      ↓
                  Invoice Created
                      ↓
                Status: invoiced
```

## User Workflows

### Workflow 1: From Job Details
1. Complete a job (or have job with calculated earnings)
2. Click "Generate Invoice" button (green)
3. System creates invoice automatically
4. Redirects to invoice page for review/editing
5. Job status updated to "invoiced"

### Workflow 2: From Jobs List
1. Find completed job in list
2. Click three-dot menu
3. Select "Generate Invoice"
4. Opens job details page with invoice button highlighted

### Workflow 3: Invoice Review
1. After generation, invoice is in "draft" status
2. User can edit any fields on invoice page
3. Update line items, tax, payment terms
4. Send invoice to client when ready

## Technical Implementation

### Database Schema

**Invoices Table** (already existed):
```sql
- job_ids UUID[]  -- Array of job IDs
- line_items JSONB
- subtotal, tax_rate, tax_amount, total_amount
- issue_date, due_date
- status (draft, sent, viewed, paid, overdue, cancelled)
```

**Jobs Table** (already existed):
```sql
- status (draft, pending, completed, invoiced, paid)
- earnings (calculated field from view)
```

### Key Functions

**`handleGenerateInvoice()`** in `/jobs/[id]/page.tsx`:
- Validates job completion
- Checks earnings exist
- Generates unique invoice number
- Creates invoice with job data
- Updates job status
- Redirects to invoice

### Invoice Number Generation

Format: `INV-YYYYMMDD-XXX`
- Example: `INV-20251004-001`
- Ensures uniqueness per user per day
- Sequential numbering

## User Benefits

1. **One-Click Invoicing**: No need to manually enter job details into invoice
2. **Automatic Linking**: Jobs and invoices are connected via `job_ids`
3. **Status Tracking**: Clear visual indication of job lifecycle
4. **Audit Trail**: Notes field shows which job generated the invoice
5. **Consistency**: All job data accurately transferred to invoice
6. **Time Savings**: Eliminates duplicate data entry

## Visual Indicators

### Job Details Page
- Green "Generate Invoice" button when eligible
- "Completed" badge for completed jobs
- Disabled/hidden when already invoiced

### Jobs List
- Green "Generate Invoice" option in dropdown
- Status badges show current state
- Earnings displayed prominently

## Error Handling

1. **No Earnings**: Shows error if earnings not calculated
2. **Already Invoiced**: Button hidden if status is invoiced/paid
3. **Not Authenticated**: Validates user session
4. **Database Errors**: Clear error messages via toast notifications

## Future Enhancements

Potential improvements:
1. **Multiple Jobs per Invoice**: Select multiple jobs to combine into one invoice
2. **Invoice Templates**: Custom templates for different job types
3. **Automatic Invoice Sending**: Email invoice to client automatically
4. **Payment Tracking**: Link payment status back to job
5. **Recurring Invoices**: For ongoing translation services
6. **Invoice Previews**: Preview before creation

## Testing Checklist

- [x] Generate invoice from completed job
- [x] Generate invoice from job with earnings
- [x] Verify invoice number uniqueness
- [x] Check job status updates to "invoiced"
- [x] Verify job_ids array contains correct job ID
- [x] Test line items calculation
- [x] Confirm redirection to invoice page
- [x] Check dropdown menu visibility
- [ ] Test with translation job
- [ ] Test with interpreting job
- [ ] Test error scenarios

## Files Modified

1. `/src/app/jobs/[id]/page.tsx`
   - Added `handleGenerateInvoice()` function
   - Added Generate Invoice button
   - Added state management for invoice generation
   - Added toast notifications

2. `/src/app/jobs/page.tsx`
   - Added Generate Invoice option to dropdown menu
   - Conditional rendering based on job status

## Documentation

See also:
- `migrations/004_create_invoices_table.sql` - Invoice schema
- `migrations/003_create_jobs_table.sql` - Jobs schema

## Support

If issues arise:
1. Check job has earnings calculated
2. Verify job status is not already invoiced
3. Check browser console for errors
4. Verify Supabase connection
5. Check user authentication

---

**Status**: ✅ Implemented and Ready for Testing
**Version**: 1.0
**Date**: 2025-10-04
