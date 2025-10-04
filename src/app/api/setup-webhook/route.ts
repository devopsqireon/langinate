import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, inboxId } = await request.json()

    if (!userId || !inboxId) {
      return NextResponse.json(
        { error: 'User ID and Inbox ID are required' },
        { status: 400 }
      )
    }

    console.log('Setting up webhook manually for:', { userId, inboxId })

    // Try to setup webhook using direct HTTP API call
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/email-webhook`

    const response = await fetch(`https://api.mailslurp.com/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MAILSLURP_API_KEY!
      },
      body: JSON.stringify({
        url: webhookUrl,
        name: 'Job Request Webhook',
        eventName: 'EMAIL_RECEIVED',
        inboxId: inboxId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webhook API error:', errorText)
      throw new Error(`Webhook setup failed: ${response.status} ${errorText}`)
    }

    const webhookData = await response.json()
    console.log('Webhook created successfully:', webhookData)

    return NextResponse.json({
      success: true,
      message: 'Webhook set up successfully',
      webhook: webhookData
    })

  } catch (error) {
    console.error('Manual webhook setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup webhook: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Webhook setup endpoint is active',
    webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/email-webhook`
  })
}