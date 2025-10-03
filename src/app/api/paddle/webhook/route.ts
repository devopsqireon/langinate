import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    console.log('=== PADDLE WEBHOOK RECEIVED ===')
    console.log('Event Type:', body.event_type)
    console.log('Full Body:', JSON.stringify(body, null, 2))

    const eventType = body.event_type

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionActivated(body.data)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(body.data)
        break

      case 'subscription.canceled':
      case 'subscription.paused':
        await handleSubscriptionCanceled(body.data)
        break

      case 'subscription.past_due':
        await handleSubscriptionPastDue(body.data)
        break

      case 'transaction.completed':
        await handlePaymentCompleted(body.data)
        break

      case 'transaction.updated':
        await handlePaymentUpdated(body.data)
        break

      default:
        console.log('Unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionActivated(data: any) {
  console.log('Activating subscription:', data)

  // Try multiple sources for customer email
  const customerEmail = data.customer_email ||
                        data.customer?.email ||
                        data.custom_data?.user_email

  if (!customerEmail) {
    console.error('No customer email found in webhook data')
    console.error('Available data:', {
      customer_email: data.customer_email,
      customer: data.customer,
      custom_data: data.custom_data
    })
    return
  }

  console.log('Looking up user by email:', customerEmail)

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', customerEmail)
    .single()

  if (userError || !user) {
    console.error('User not found:', customerEmail, 'Error:', userError)
    return
  }

  console.log('Found user:', user.id)

  // Update subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      paddle_price_id: data.items?.[0]?.price?.id,
      paddle_product_id: data.items?.[0]?.price?.product_id,
      subscription_start_date: data.started_at || new Date().toISOString(),
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      currency: data.currency_code || 'USD',
      amount: data.items?.[0]?.price?.unit_price?.amount
        ? parseFloat(data.items[0].price.unit_price.amount) / 100
        : null,
    })
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating subscription:', error)
  } else {
    console.log('Subscription activated successfully')
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('Updating subscription:', data)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      cancel_at_period_end: data.scheduled_change?.action === 'cancel',
    })
    .eq('paddle_subscription_id', data.id)

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionCanceled(data: any) {
  console.log('Canceling subscription:', data)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancel_at_period_end: true,
    })
    .eq('paddle_subscription_id', data.id)

  if (error) {
    console.error('Error canceling subscription:', error)
  }
}

async function handleSubscriptionPastDue(data: any) {
  console.log('Subscription past due:', data)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('paddle_subscription_id', data.id)

  if (error) {
    console.error('Error updating subscription to past_due:', error)
  }
}

async function handlePaymentCompleted(data: any) {
  console.log('=== HANDLING PAYMENT COMPLETED ===')
  console.log('Subscription ID:', data.subscription_id)
  console.log('Customer ID:', data.customer_id)
  console.log('Amount:', data.details?.totals?.total || data.amount)
  console.log('Custom Data:', data.custom_data)

  try {
    let subscription = null

    // Try to find subscription by paddle_subscription_id
    if (data.subscription_id) {
      console.log('Looking for subscription with paddle_subscription_id:', data.subscription_id)

      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, id')
        .eq('paddle_subscription_id', data.subscription_id)
        .single()

      if (!subError && sub) {
        subscription = sub
      } else {
        console.log('Subscription not found by paddle_subscription_id, trying customer_id...')
      }
    }

    // Fallback: Find by customer_id (most recent subscription for this customer)
    if (!subscription && data.customer_id) {
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, id')
        .eq('paddle_customer_id', data.customer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!subError && sub) {
        subscription = sub
        console.log('Found subscription by customer_id:', data.customer_id)
      }
    }

    if (!subscription) {
      console.error('❌ Subscription not found for payment. Subscription ID:', data.subscription_id, 'Customer ID:', data.customer_id)
      return
    }

    console.log('Found subscription:', subscription)

    // Parse amount correctly
    // In sandbox mode, amounts are often $0, so we'll use $29 as default for display
    let amount = data.details?.totals?.total
      ? parseFloat(data.details.totals.total) / 100
      : data.amount
      ? parseFloat(data.amount) / 100
      : null

    // If amount is 0 (sandbox mode), use the price from items
    if (amount === 0 && data.items && data.items.length > 0) {
      const priceItem = data.items[0]?.price
      if (priceItem?.unit_price?.amount) {
        amount = parseFloat(priceItem.unit_price.amount) / 100
      } else {
        // Default to $29 for sandbox testing
        amount = 29.00
      }
    }

    console.log('Parsed amount:', amount)

    // Record the payment
    const paymentData = {
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      paddle_payment_id: data.id,
      paddle_transaction_id: data.transaction_id,
      paddle_invoice_id: data.invoice_id,
      amount: amount,
      currency: data.currency_code || 'USD',
      status: 'completed',
      paid_at: data.created_at || new Date().toISOString(),
      invoice_url: data.invoice_pdf_url || data.receipt_data?.url,
      receipt_url: data.receipt_data?.url,
      description: `Subscription payment - ${data.billing_period?.starts_at ? new Date(data.billing_period.starts_at).toLocaleDateString() : 'N/A'}`,
      metadata: data,
    }

    console.log('Inserting payment:', paymentData)

    const { data: insertedPayment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      console.error('Payment error details:', JSON.stringify(paymentError, null, 2))
    } else {
      console.log('✅ Payment recorded successfully:', insertedPayment)
    }
  } catch (error) {
    console.error('Error handling payment completed:', error)
    console.error('Error stack:', (error as Error).stack)
  }
}

async function handlePaymentUpdated(data: any) {
  console.log('Payment updated:', data)

  const { error } = await supabase
    .from('payments')
    .update({
      status: data.status === 'paid' ? 'completed' : data.status,
      invoice_url: data.invoice_pdf_url || data.receipt_data?.url,
      receipt_url: data.receipt_data?.url,
    })
    .eq('paddle_payment_id', data.id)

  if (error) {
    console.error('Error updating payment:', error)
  }
}
