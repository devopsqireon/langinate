import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseEmailWebhookData, type ParsedEmailData } from '@/lib/mailslurp'

export async function POST(request: NextRequest) {
  // Create Supabase client inside the function to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    console.log('Email webhook received')

    // Parse the webhook data
    const webhookData = await request.json()
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract email data
    const emailData: ParsedEmailData = parseEmailWebhookData(webhookData)
    console.log('Parsed email data:', emailData)

    // Find user by forwarding email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('forwarding_email', emailData.to)
      .single()

    if (profileError || !profile) {
      console.error('No user found for forwarding email:', emailData.to)
      return NextResponse.json(
        { error: 'No user found for this forwarding email' },
        { status: 404 }
      )
    }

    console.log('Found user:', profile.user_id)

    // Check if client exists or create placeholder
    let clientId = null

    // Try to find existing client by email or name
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', profile.user_id)
      .or(`email.eq.${emailData.from},name.eq.${emailData.from}`)
      .limit(1)

    if (existingClient && existingClient.length > 0) {
      clientId = existingClient[0].id
      console.log('Found existing client:', clientId)
    } else {
      // Create new client from email sender
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([{
          user_id: profile.user_id,
          name: emailData.from.split('@')[0] || emailData.from, // Use email username as name
          email: emailData.from,
          company: null
        }])
        .select('id')
        .single()

      if (clientError) {
        console.error('Error creating client:', clientError)
        return NextResponse.json(
          { error: 'Failed to create client' },
          { status: 500 }
        )
      }

      clientId = newClient.id
      console.log('Created new client:', clientId)
    }

    // Create draft job
    const { data: draftJob, error: jobError } = await supabase
      .from('jobs')
      .insert([{
        user_id: profile.user_id,
        client_id: clientId,
        type: 'translation', // Default type, user can change later
        status: 'draft',
        email_from: emailData.from,
        email_subject: emailData.subject,
        email_body: emailData.textBody,
        received_at: emailData.receivedAt.toISOString(),
        description: `Email: ${emailData.subject}`,
        deadline: null,
        // Leave other fields null for manual completion
        source_lang: null,
        target_lang: null,
        word_count: null,
        rate_per_word: null,
        hours: null,
        rate_per_hour: null
      }])
      .select()
      .single()

    if (jobError) {
      console.error('Error creating draft job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create draft job' },
        { status: 500 }
      )
    }

    console.log('Created draft job:', draftJob.id)

    return NextResponse.json({
      success: true,
      message: 'Draft job created successfully',
      jobId: draftJob.id
    })

  } catch (error) {
    console.error('Email webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET() {
  return NextResponse.json({
    status: 'Email webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}