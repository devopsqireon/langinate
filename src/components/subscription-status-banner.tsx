"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserSubscription, getDaysRemainingInTrial } from "@/lib/subscription"
import type { Subscription } from "@/lib/subscription"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Crown, ArrowRight } from "lucide-react"

export function SubscriptionStatusBanner() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const sub = await getUserSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !subscription) return null

  const daysRemaining = getDaysRemainingInTrial(subscription)
  const isOnTrial = subscription.status === 'trial'
  const isActive = subscription.status === 'active'

  // Show trial status banner
  if (isOnTrial && daysRemaining > 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-b border-blue-200 dark:border-blue-800">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                <span className="font-bold">{daysRemaining} days</span> left in your free trial
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => router.push('/pricing')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upgrade Now
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show active subscription badge (subtle)
  if (isActive) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10 border-b border-green-100 dark:border-green-900">
        <div className="container mx-auto px-4 py-1.5">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-3 w-3 text-green-600 dark:text-green-400" />
            <p className="text-xs font-medium text-green-800 dark:text-green-200">
              Pro Subscriber
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
