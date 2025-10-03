"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getUserSubscription, getDaysRemainingInTrial } from "@/lib/subscription"
import { createClient } from "@/lib/supabase-client"
import { openCheckout, PADDLE_CONFIG } from "@/lib/paddle"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  Crown,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Settings,
  FileText,
  DollarSign,
} from "lucide-react"
import type { Subscription } from "@/lib/subscription"

interface PaymentHistory {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  invoice_url?: string
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    fetchData()
    fetchPaymentHistory()

    // Check for success parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      toast.success('Payment successful! Your subscription is now active.', {
        duration: 5000,
      })
      // Remove success param from URL
      window.history.replaceState({}, '', '/subscription')
    }
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }

      const sub = await getUserSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('paid_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setPaymentHistory(data || [])
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      setUpgrading(true)
      await openCheckout(
        PADDLE_CONFIG.priceId,
        userEmail,
        { user_email: userEmail }
      )
      toast.success("Checkout completed! Your subscription is being activated...")
      setTimeout(async () => {
        await fetchData()
      }, 3000)
    } catch (error: any) {
      if (error.message !== 'Checkout closed') {
        toast.error("Failed to open checkout. Please try again.")
      }
    } finally {
      setUpgrading(false)
    }
  }

  const openCustomerPortal = () => {
    // Paddle's customer portal URL - users can manage their subscription here
    toast.info("Opening Paddle billing portal...")
    // In production, you'd get this URL from Paddle API
    window.open('https://sandbox-vendors.paddle.com/', '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const daysRemaining = subscription ? getDaysRemainingInTrial(subscription) : 0
  const isOnTrial = subscription?.status === 'trial'
  const isActive = subscription?.status === 'active'
  const isPastDue = subscription?.status === 'past_due'
  const isCanceled = subscription?.status === 'canceled'

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, billing information, and payment history
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isActive ? 'bg-green-100 dark:bg-green-900/20' :
                isOnTrial ? 'bg-blue-100 dark:bg-blue-900/20' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {isActive ? (
                  <Crown className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isActive ? 'Professional Plan' : 'Trial Period'}
                </CardTitle>
                <CardDescription>
                  {isActive && 'Full access to all features'}
                  {isOnTrial && `${daysRemaining} days remaining`}
                  {isPastDue && 'Payment past due'}
                  {isCanceled && 'Subscription canceled'}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isActive ? 'default' : isOnTrial ? 'secondary' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              {subscription?.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="text-2xl font-bold">
                {isActive && subscription?.amount
                  ? `$${subscription.amount}/mo`
                  : isOnTrial
                  ? '$0'
                  : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {isActive ? 'Next Billing Date' : isOnTrial ? 'Trial Ends' : 'Status'}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {isActive && subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : isOnTrial && subscription?.trial_end_date
                  ? new Date(subscription.trial_end_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Payment Method</span>
              </div>
              <p className="text-lg font-semibold">
                {isActive ? 'Card •••• 4242' : 'None'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!isActive && (
              <Button
                size="lg"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 sm:flex-none"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro - $29/mo
                  </>
                )}
              </Button>
            )}

            {isActive && (
              <>
                <Button
                  variant="outline"
                  onClick={openCustomerPortal}
                  className="flex-1 sm:flex-none"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/pricing'}
                  className="flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </>
            )}
          </div>

          {/* Auto-renewal notice */}
          {isActive && !subscription?.cancel_at_period_end && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Your subscription will automatically renew on{' '}
                  <strong>
                    {subscription?.current_period_end &&
                      new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  Your subscription is set to cancel on{' '}
                  <strong>
                    {subscription?.current_period_end &&
                      new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Included */}
      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>
            {isActive ? 'Your active subscription includes:' : 'Upgrade to get access to:'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Unlimited client management',
              'Create unlimited jobs & invoices',
              'Advanced analytics & insights',
              'Access to professional training',
              'Secure data encryption',
              'Priority customer support',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History - Show if user has payments or is active */}
      {(isActive || paymentHistory.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View and download your past invoices</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPaymentHistory}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment history yet</p>
                <p className="text-sm mt-1">Invoices will appear here after your first payment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                        payment.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        {payment.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          ${payment.amount?.toFixed(2)} {payment.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                      {payment.invoice_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(payment.invoice_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing Information */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Manage your billing details and payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Email</h4>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Payment Method</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Card ending in •••• 4242</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={openCustomerPortal}>
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Have questions about your subscription or billing? We're here to help!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/pricing'}>
              View FAQ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
