import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInboxForUser, setupWebhookForInbox } from '@/lib/mailslurp'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Generating inbox for user:', userId)

    // Check if user already has an inbox
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('forwarding_email, mailslurp_inbox_id')
      .eq('user_id', userId)
      .single()

    if (existingProfile?.forwarding_email) {
      return NextResponse.json({
        success: true,
        message: 'User already has a forwarding email',
        forwardingEmail: existingProfile.forwarding_email,
        inboxId: existingProfile.mailslurp_inbox_id
      })
    }

    // Create new MailSlurp inbox
    const { inboxId, emailAddress } = await createInboxForUser()
    console.log('Created inbox:', { inboxId, emailAddress })

    // Set up webhook for the inbox (optional - don't fail if this doesn't work)
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/email-webhook`
    try {
      await setupWebhookForInbox(inboxId, webhookUrl)
      console.log('Webhook setup complete for:', webhookUrl)
    } catch (webhookError) {
      console.warn('Webhook setup failed, but inbox still created:', webhookError)
      // Continue anyway - user can still use the inbox manually
    }

    // Update or create user profile with inbox details
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        forwarding_email: emailAddress,
        mailslurp_inbox_id: inboxId
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to save inbox to profile' },
        { status: 500 }
      )
    }

    console.log('Profile updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Inbox created and configured successfully',
      forwardingEmail: emailAddress,
      inboxId: inboxId
    })

  } catch (error) {
    console.error('Generate inbox error:', error)
    return NextResponse.json(
      { error: 'Failed to generate inbox: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's current inbox info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('forwarding_email, mailslurp_inbox_id')
      .eq('user_id', userId)
      .single()

    if (error) {
      return NextResponse.json(
        { forwardingEmail: null, inboxId: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      forwardingEmail: profile.forwarding_email,
      inboxId: profile.mailslurp_inbox_id
    })

  } catch (error) {
    console.error('Get inbox error:', error)
    return NextResponse.json(
      { error: 'Failed to get inbox info' },
      { status: 500 }
    )
  }
}