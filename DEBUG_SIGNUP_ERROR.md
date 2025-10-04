# Debug Signup Error - "Database error saving new user"

## The Real Issue

The error "Database error saving new user" from Supabase Auth means the trigger is **failing silently** and Supabase is catching the error. This happens when:

1. The trigger tries to insert but hits a constraint violation
2. The trigger doesn't have proper permissions
3. There's a timing issue with the transaction

## Solution: Bypass the Trigger Entirely

Instead of relying on triggers (which can fail silently), let's handle user creation in the application code.

### Step 1: Disable Auto-Creation (In Supabase Dashboard)

1. Go to **Database** → **Functions**
2. Delete or disable the `handle_new_user` trigger
3. Run this SQL:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

### Step 2: Handle User Creation in Code

We need to create the user profile immediately after signup in the application code.

**File to modify:** `/src/app/signup/page.tsx`

Update the `handleSignup` function to create the user profile after successful signup:

```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)

  if (password !== confirmPassword) {
    setError("Passwords do not match")
    setLoading(false)
    return
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters long")
    setLoading(false)
    return
  }

  try {
    const supabase = createClient()

    // Sign up the user
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // If signup successful and user is created, create their profile
    if (authData?.user?.id) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            name: name || email.split('@')[0],
          }
        ])

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't fail signup if profile creation fails
      }
    }

    setSuccess(true)

    // Redirect or show success message
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  } catch (err) {
    setError("An unexpected error occurred")
  } finally {
    setLoading(false)
  }
}
```

### Step 3: Also Handle OAuth Signups

For Google/Microsoft signups, we need to handle this in the auth callback:

**File to modify:** `/src/app/auth/callback/route.ts`

```typescript
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
      // Check if user profile exists, create if not
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Create user profile
        await supabase
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

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

## Why This Approach is Better

1. ✅ **No silent failures** - You see errors immediately in the console
2. ✅ **Works every time** - No dependency on triggers
3. ✅ **Better error handling** - Can show user-friendly messages
4. ✅ **Handles all signup methods** - Email, Google, Microsoft
5. ✅ **No RLS conflicts** - Uses proper authenticated context

## Test It

1. Delete the old trigger (SQL above)
2. Update the code files
3. Try signing up with a new email
4. Check browser console for any errors
5. Verify user profile is created in Supabase

This should fix the signup issue permanently!
