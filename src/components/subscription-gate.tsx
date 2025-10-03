"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserSubscription, hasActiveSubscription, getDaysRemainingInTrial, isTrialExpired } from "@/lib/subscription"
import type { Subscription } from "@/lib/subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Calendar, CheckCircle, ArrowRight } from "lucide-react"

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const sub = await getUserSubscription()
      setSubscription(sub)

      const access = await hasActiveSubscription()
      setHasAccess(access)
    } catch (error) {
      console.error('Error checking subscription:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // No access - show upgrade screen
  if (!hasAccess || !subscription) {
    const trialExpired = subscription ? isTrialExpired(subscription) : false

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-3xl mb-2">
                {trialExpired ? "Your Trial Has Expired" : "Subscription Required"}
              </CardTitle>
              <CardDescription className="text-base">
                {trialExpired
                  ? "Your 15-day free trial has ended. Subscribe to continue using the platform."
                  : "You need an active subscription to access this platform."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {subscription && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trial Period</span>
                  <Badge variant="secondary">Expired</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Started: {new Date(subscription.trial_start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Ended: {new Date(subscription.trial_end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold">What you'll get:</h3>
              <ul className="space-y-2">
                {[
                  'Unlimited translation and interpretation jobs',
                  'Client and invoice management',
                  'Professional training and certifications',
                  'Advanced analytics and reporting',
                  'Priority customer support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => router.push('/pricing')}
              >
                View Pricing & Subscribe
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/login')}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Has access - render children
  return <>{children}</>
}
