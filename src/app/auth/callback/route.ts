import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Check if user profile exists, create if not (for OAuth signups)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        console.log('Creating user profile for OAuth user:', user.id)

        // Create user profile for OAuth signup
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              name: user.user_metadata?.name ||
                    user.user_metadata?.full_name ||
                    user.email?.split('@')[0] ||
                    'User',
            }
          ])
          .select()

        if (profileError) {
          console.error('❌ OAuth profile creation error:', profileError)
        } else {
          console.log('✅ OAuth profile created successfully:', profileData)
        }

        // Create trial subscription (15 days)
        const trialStart = new Date()
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 15)

        console.log('Creating OAuth trial subscription with dates:', {
          start: trialStart.toISOString(),
          end: trialEnd.toISOString()
        })

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert([
            {
              user_id: user.id,
              status: 'trial',
              trial_start_date: trialStart.toISOString(),
              trial_end_date: trialEnd.toISOString(),
            }
          ])
          .select()

        if (subscriptionError) {
          console.error('❌ OAuth subscription creation error:', subscriptionError)
        } else {
          console.log('✅ OAuth trial subscription created successfully:', subscriptionData)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}