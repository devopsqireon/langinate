import { MailSlurp } from 'mailslurp-client'

// Initialize MailSlurp client
export const mailslurp = new MailSlurp({
  apiKey: process.env.MAILSLURP_API_KEY!
})

export interface CreateInboxResult {
  inboxId: string
  emailAddress: string
}

export async function createInboxForUser(): Promise<CreateInboxResult> {
  try {
    const inbox = await mailslurp.createInbox({
      name: `Translator-${Date.now()}`,
      description: 'Job request forwarding inbox'
    })

    return {
      inboxId: inbox.id!,
      emailAddress: inbox.emailAddress!
    }
  } catch (error) {
    console.error('Error creating MailSlurp inbox:', error)
    throw new Error('Failed to create email inbox')
  }
}

export async function setupWebhookForInbox(inboxId: string, webhookUrl: string) {
  try {
    // Use the webhookController to create webhooks
    const webhook = await mailslurp.webhookController.createWebhookForInbox({
      inboxId,
      webhookOptions: {
        url: webhookUrl,
        name: 'Job Request Webhook',
        eventName: 'EMAIL_RECEIVED'
      }
    })

    return webhook
  } catch (error) {
    console.error('Error setting up webhook:', error)
    console.error('Webhook URL attempted:', webhookUrl)
    console.error('Inbox ID:', inboxId)

    // Log the error details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    throw new Error('Failed to setup email webhook: ' + (error as Error).message)
  }
}

export interface ParsedEmailData {
  to: string
  from: string
  subject: string
  textBody: string
  htmlBody?: string
  receivedAt: Date
}

export function parseEmailWebhookData(webhookData: any): ParsedEmailData {
  const email = webhookData.email || webhookData

  return {
    to: email.to?.[0] || email.to || '',
    from: email.from || '',
    subject: email.subject || 'No Subject',
    textBody: email.body || email.textBody || '',
    htmlBody: email.htmlBody || undefined,
    receivedAt: new Date(email.createdAt || email.receivedAt || Date.now())
  }
}

export async function getEmailsFromInbox(inboxId: string, limit: number = 20) {
  try {
    // Get emails from inbox
    const emails = await mailslurp.inboxController.getEmails({
      inboxId,
      limit,
      sort: 'DESC' // Newest first
    })

    return emails.content || []
  } catch (error) {
    console.error('Error fetching emails from inbox:', error)
    throw new Error('Failed to fetch emails from inbox')
  }
}