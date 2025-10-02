import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { forwardingEmail, senderEmail, subject, body } = await request.json()

    // Simulate webhook data format
    const mockWebhookData = {
      email: {
        to: [forwardingEmail],
        from: senderEmail || 'test@example.com',
        subject: subject || 'Test Job Request',
        body: body || 'This is a test email for job sync functionality.',
        textBody: body || 'This is a test email for job sync functionality.',
        createdAt: new Date().toISOString()
      }
    }

    console.log('Simulating email webhook with data:', mockWebhookData)

    // Call our webhook endpoint directly
    const webhookResponse = await fetch('http://localhost:3001/api/email-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookData)
    })

    const webhookResult = await webhookResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Test email processed',
      webhookResponse: webhookResult,
      mockData: mockWebhookData
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to process test email: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Test email endpoint is active',
    usage: 'POST with { forwardingEmail, senderEmail, subject, body }'
  })
}