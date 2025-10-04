import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmailsFromInbox } from '@/lib/mailslurp'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's inbox info
    const { data: profile } = await supabase
      .from('profiles')
      .select('mailslurp_inbox_id, forwarding_email')
      .eq('user_id', userId)
      .single()

    if (!profile || !profile.mailslurp_inbox_id) {
      return NextResponse.json(
        { error: 'No inbox found for user' },
        { status: 404 }
      )
    }

    // Fetch emails from MailSlurp
    const emails = await getEmailsFromInbox(profile.mailslurp_inbox_id)

    let processedCount = 0
    const errors: string[] = []

    // Process each email
    for (const email of emails) {
      try {
        // Check if email already processed
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id')
          .eq('email_message_id', email.id)
          .single()

        if (existingJob) {
          continue // Skip already processed emails
        }

        // Extract sender email
        const senderEmail = email.from || 'unknown@example.com'
        const senderName = email.from?.split('<')[0].trim() || 'Unknown'

        // Find or create client
        let clientId = null

        // Try to find existing client by email
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId)
          .eq('contact_email', senderEmail)
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          // Create new client
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([{
              user_id: userId,
              name: senderName,
              contact_email: senderEmail,
            }])
            .select()
            .single()

          if (clientError) {
            errors.push(`Failed to create client for ${senderEmail}: ${clientError.message}`)
            continue
          }

          clientId = newClient.id
        }

        // Create draft job
        const { error: jobError } = await supabase
          .from('jobs')
          .insert([{
            user_id: userId,
            client_id: clientId,
            status: 'draft',
            email_from: senderEmail,
            email_subject: email.subject || 'No Subject',
            email_body: email.body || email.textBody || '',
            email_message_id: email.id,
            received_at: email.createdAt || new Date().toISOString(),
          }])

        if (jobError) {
          errors.push(`Failed to create job for email ${email.id}: ${jobError.message}`)
        } else {
          processedCount++
        }

      } catch (error) {
        errors.push(`Error processing email: ${(error as Error).message}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: emails.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Poll emails error:', error)
    return NextResponse.json(
      { error: 'Failed to poll emails: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
