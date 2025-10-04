import { createClient } from './supabase-client'

export interface Subscription {
  id: string
  user_id: string
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
  trial_start_date: string
  trial_end_date: string
  paddle_subscription_id?: string
  subscription_end_date?: string
  cancel_at_period_end: boolean
}

export async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('No user found in getUserSubscription')
    return null
  }

  console.log('Fetching subscription for user:', user.id)

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('❌ Error fetching subscription:', error)
    return null
  }

  console.log('✅ Subscription fetched:', data)
  return data
}

export async function hasActiveSubscription(): Promise<boolean> {
  const subscription = await getUserSubscription()
  if (!subscription) {
    console.log('❌ No subscription found - blocking access')
    return false
  }

  console.log('Checking subscription status:', subscription.status)

  // Check if subscription is active
  if (subscription.status === 'active') {
    console.log('✅ Active subscription - granting access')
    return true
  }

  // Check if trial is still valid
  if (subscription.status === 'trial') {
    const trialEnd = new Date(subscription.trial_end_date)
    const now = new Date()
    const isValid = trialEnd > now
    console.log('Trial check:', {
      trialEnd: trialEnd.toISOString(),
      now: now.toISOString(),
      isValid
    })
    if (isValid) {
      console.log('✅ Valid trial - granting access')
    } else {
      console.log('❌ Trial expired - blocking access')
    }
    return isValid
  }

  console.log('❌ No valid subscription - blocking access')
  return false
}

export function getDaysRemainingInTrial(subscription: Subscription): number {
  if (subscription.status !== 'trial') return 0

  const trialEnd = new Date(subscription.trial_end_date)
  const now = new Date()
  const diff = trialEnd.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  return Math.max(0, days)
}

export function isTrialExpired(subscription: Subscription): boolean {
  if (subscription.status !== 'trial') return false

  const trialEnd = new Date(subscription.trial_end_date)
  return trialEnd < new Date()
}

export async function updateSubscriptionStatus(
  userId: string,
  paddleData: {
    subscription_id: string
    customer_id: string
    status: string
    current_period_start?: string
    current_period_end?: string
  }
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paddle_subscription_id: paddleData.subscription_id,
      paddle_customer_id: paddleData.customer_id,
      subscription_start_date: paddleData.current_period_start || new Date().toISOString(),
      current_period_start: paddleData.current_period_start,
      current_period_end: paddleData.current_period_end,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}
