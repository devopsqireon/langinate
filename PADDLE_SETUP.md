# Paddle Subscription Setup Guide

## Overview
This guide will walk you through setting up Paddle Sandbox for the subscription system with a 15-day free trial and $29/month paid plan.

---

## 1. Database Setup

### Run the SQL Migration
Execute the migration file in your Supabase SQL Editor:

```bash
migrations/011_create_subscriptions_table.sql
```

This will:
- Create the `subscriptions` table
- Set up Row Level Security (RLS) policies
- Create helper functions (`has_active_subscription`)
- Create automatic trial creation trigger for new users
- Create trial subscriptions for existing users

---

## 2. Paddle Account Setup

### Create a Paddle Sandbox Account
1. Go to [Paddle Sandbox](https://sandbox-vendors.paddle.com/signup)
2. Sign up for a free sandbox account
3. Complete the onboarding process

### Create a Product and Price

1. **Navigate to Catalog > Products**
   - Click "Create Product"
   - Name: "Professional Plan"
   - Description: "Full access to translator management platform"

2. **Add a Price**
   - Click "Add Price" on your product
   - Billing Cycle: Monthly
   - Amount: $29.00 USD
   - Save the **Price ID** (starts with `pri_`)

3. **Get Your Credentials**
   - Go to **Developer Tools > Authentication**
   - Copy your **Client-side Token** (starts with `live_` or `test_`)
   - Go to **Developer Tools > API Keys**
   - Create and copy your **Service Role Key** (for webhooks)

### Configure Webhook

1. **Navigate to Developer Tools > Notifications**
2. Click "Create Notification Destination"
3. Set the following:
   - **Destination URL**: `https://your-domain.com/api/paddle/webhook`
   - **Description**: "Subscription Events"
   - **Events to Subscribe**:
     - `subscription.created`
     - `subscription.activated`
     - `subscription.updated`
     - `subscription.canceled`
     - `subscription.paused`
     - `subscription.past_due`
4. Save the webhook

> **Note**: For local testing, use a tool like [ngrok](https://ngrok.com/) to create a public URL:
> ```bash
> ngrok http 3000
> # Then use: https://your-ngrok-url.ngrok.io/api/paddle/webhook
> ```

---

## 3. Environment Variables

### Update Your .env.local File

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Paddle Configuration
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_PRICE_ID=pri_xxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_PRODUCT_ID=pro_xxxxxxxxxxxx
```

### Where to Find Each Value

| Variable | Where to Find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Project Settings > API (⚠️ Keep secret!) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle Dashboard > Developer Tools > Authentication |
| `NEXT_PUBLIC_PADDLE_PRICE_ID` | Paddle Dashboard > Catalog > Products > Your Product > Price ID |
| `NEXT_PUBLIC_PADDLE_PRODUCT_ID` | Paddle Dashboard > Catalog > Products > Your Product > Product ID |

---

## 4. Testing the Subscription Flow

### Test Trial Creation
1. Sign up a new user
2. Check Supabase `subscriptions` table
3. Verify a trial subscription was created with:
   - `status = 'trial'`
   - `trial_end_date` is 15 days from now

### Test Paddle Checkout
1. Log in as a trial user
2. Go to `/pricing`
3. Click "Start 15-Day Free Trial" or "Upgrade to Pro Now"
4. Paddle checkout should open
5. Use [Paddle test cards](https://developer.paddle.com/concepts/payment-methods/credit-debit-card#test-card-numbers):
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVV: Any 3 digits

### Test Webhook Events
1. Complete a test checkout
2. Check your webhook endpoint logs in Paddle Dashboard
3. Verify the subscription status updated in Supabase:
   - `status` changed from `'trial'` to `'active'`
   - `paddle_subscription_id` is populated
   - `current_period_start` and `current_period_end` are set

### Test Subscription Gate
1. Create a test user
2. Manually update their `trial_end_date` to a past date in Supabase
3. Try to access the app
4. You should see the "Your Trial Has Expired" screen
5. Clicking "View Pricing & Subscribe" should redirect to `/pricing`

---

## 5. Going to Production

When ready to launch:

1. **Create Production Paddle Account**
   - Sign up at [paddle.com](https://www.paddle.com/)
   - Complete business verification

2. **Update Environment Variables**
   - Change `NEXT_PUBLIC_PADDLE_ENVIRONMENT=production`
   - Update all Paddle credentials with production values

3. **Update Webhook URL**
   - Set production webhook URL in Paddle Dashboard
   - Ensure HTTPS is enabled

4. **Test Production Flow**
   - Test with real payment methods
   - Verify webhooks are working
   - Check subscription updates in production database

---

## 6. Subscription Features

### What's Included

✅ **15-Day Free Trial**
- Automatically created for new users
- Full access to all features
- No credit card required

✅ **Single Paid Plan**
- $29/month Professional Plan
- Unlimited features access
- Cancel anytime

✅ **Access Control**
- Trial users get full access until trial expires
- Expired trials are blocked from app access
- Active subscribers have unlimited access

✅ **Paddle Integration**
- Secure checkout flow
- Automatic subscription management
- Webhook-based status updates

✅ **User Experience**
- Trial status banner showing days remaining
- Seamless upgrade flow
- Clear subscription status indicators

---

## 7. Troubleshooting

### Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check webhook logs in Paddle Dashboard
- Ensure webhook endpoint returns 200 status
- For local development, use ngrok

### Subscription Not Updating
- Check webhook is configured for all subscription events
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check server logs for webhook errors
- Ensure user email matches between Paddle and Supabase

### Trial Not Created
- Check database trigger is installed correctly
- Verify RLS policies allow inserts
- Check `auth.users` table has email field
- Review Supabase logs for errors

### Checkout Not Opening
- Verify `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is correct
- Check browser console for Paddle errors
- Ensure Paddle environment (sandbox/production) matches token
- Verify Price ID exists in your Paddle account

---

## Support

For Paddle-specific issues:
- [Paddle Documentation](https://developer.paddle.com/)
- [Paddle Support](https://www.paddle.com/support)

For Supabase issues:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
