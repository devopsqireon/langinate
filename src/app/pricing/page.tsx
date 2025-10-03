"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { openCheckout, PADDLE_CONFIG } from "@/lib/paddle"
import { getUserSubscription, getDaysRemainingInTrial } from "@/lib/subscription"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  CheckCircle,
  Zap,
  Shield,
  Users,
  BarChart,
  FileText,
  GraduationCap,
  Loader2,
  ArrowRight,
  Sparkles
} from "lucide-react"

export default function Pricing() {
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [userEmail, setUserEmail] = useState("")
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchData()
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
    } finally {
      setLoadingData(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      await openCheckout(
        PADDLE_CONFIG.priceId,
        userEmail,
        { user_email: userEmail }
      )

      toast.success("Checkout completed! Your subscription is being activated...")

      // Refresh subscription data after a delay
      setTimeout(async () => {
        await fetchData()
      }, 3000)

    } catch (error: any) {
      if (error.message !== 'Checkout closed') {
        toast.error("Failed to open checkout. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const daysRemaining = subscription ? getDaysRemainingInTrial(subscription) : 0
  const isOnTrial = subscription?.status === 'trial'
  const isActive = subscription?.status === 'active'

  const features = [
    { icon: Users, text: "Unlimited client management" },
    { icon: FileText, text: "Create unlimited jobs & invoices" },
    { icon: BarChart, text: "Advanced analytics & insights" },
    { icon: GraduationCap, text: "Access to professional training" },
    { icon: Shield, text: "Secure data encryption" },
    { icon: Zap, text: "Priority customer support" },
  ]

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Succeed
          </h1>
          <p className="text-lg text-muted-foreground">
            Start with a 15-day free trial. No credit card required.
          </p>
        </div>

        {/* Trial Status Banner */}
        {isOnTrial && daysRemaining > 0 && (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        You're on a free trial
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {daysRemaining} days remaining - Upgrade anytime to continue after trial
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Subscription Banner */}
        {isActive && (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Your subscription is active
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Thank you for being a subscriber! You have full access to all features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary relative overflow-hidden">
            {/* Recommended Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 text-sm font-medium">
              Recommended
            </div>

            <CardHeader className="text-center pt-12 pb-8">
              <CardTitle className="text-3xl mb-2">Professional Plan</CardTitle>
              <CardDescription className="text-base">
                Perfect for freelance translators and interpreters
              </CardDescription>
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Billed monthly • Cancel anytime
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 pb-12">
              {/* Trial Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Start with 15-Day Free Trial</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      No credit card needed. Upgrade anytime to continue after trial.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-900 dark:text-green-100">Upgrade During or After Trial</p>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>✓ Pay $29 once to activate subscription</li>
                      <li>✓ Card securely saved for monthly auto-renewal</li>
                      <li>✓ Cancel anytime - no long-term commitment</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-4 text-lg">Everything included:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <feature.icon className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              {!isActive && (
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full text-lg h-14"
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Opening Checkout...
                      </>
                    ) : (
                      <>
                        {isOnTrial && daysRemaining > 0
                          ? "Subscribe Now - $29/month"
                          : "Start 15-Day Free Trial"}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                  {isOnTrial && daysRemaining > 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                      First charge: $29 today • Then $29/month automatically
                    </p>
                  )}
                  {!isOnTrial && (
                    <p className="text-center text-xs text-muted-foreground">
                      Start free trial • Add payment method when ready to continue
                    </p>
                  )}
                </div>
              )}

              {/* Footer Note */}
              <p className="text-center text-sm text-muted-foreground">
                Secure checkout powered by Paddle • All major payment methods accepted
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We accept all major credit cards, PayPal, and other payment methods through our secure payment processor, Paddle.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is my data secure?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Absolutely. We use industry-standard encryption and security measures to protect your data. Your information is stored securely and never shared.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Yes, we offer a 30-day money-back guarantee. If you're not satisfied with our service, contact us for a full refund.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
