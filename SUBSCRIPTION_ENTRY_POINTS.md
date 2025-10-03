# Subscription Entry Points - User Journey

## Overview
The pricing/subscription page is now fully integrated within the application. Users can access it from multiple strategic entry points throughout their journey.

---

## Entry Points

### 1. **Sidebar Navigation** ⭐ PRIMARY
**Location**: `src/components/app-sidebar.tsx`

- **Menu Item**: "Subscription" with Credit Card icon
- **Position**: Footer section (between Profile and Settings)
- **Always Visible**: Yes - available from any page
- **Best For**: Users who want to check their plan or upgrade anytime

**User Flow**:
```
Any Page → Click "Subscription" in sidebar → View pricing & upgrade
```

---

### 2. **Trial Status Banner** ⭐ PRIMARY
**Location**: Top of every page (above header)

- **Visibility**: Only shown to trial users
- **Content**: "X days left in your free trial" + "Upgrade Now" button
- **Design**: Blue gradient banner with call-to-action
- **Best For**: Reminding trial users about their remaining time

**User Flow**:
```
Any Page → See trial banner → Click "Upgrade Now" → Pricing page
```

---

### 3. **Subscription Gate** ⭐ AUTOMATIC
**Location**: `src/components/subscription-gate.tsx`

- **Triggers**: When trial expires or subscription is inactive
- **Blocks**: All app access automatically
- **Content**: "Your Trial Has Expired" screen with upgrade CTA
- **Best For**: Converting expired trial users

**User Flow**:
```
Trial Expires → Login → Subscription Gate → Click "View Pricing & Subscribe" → Upgrade
```

---

### 4. **Direct URL Access**
**URL**: `/pricing`

- **Access**: Available to all authenticated users
- **Layout**: Integrated within app (sidebar + header)
- **Best For**: Direct links, bookmarks, or email campaigns

**User Flow**:
```
Email/Link → /pricing → View plan & upgrade
```

---

### 5. **Dashboard Widget** (RECOMMENDED TO ADD)
**Location**: Could be added to `/dashboard`

```tsx
// Suggested addition to dashboard
<Card>
  <CardHeader>
    <CardTitle>Your Subscription</CardTitle>
  </CardHeader>
  <CardContent>
    {isOnTrial ? (
      <div>
        <p>{daysRemaining} days left in trial</p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro
        </Button>
      </div>
    ) : (
      <div>
        <Badge>Pro Subscriber</Badge>
        <Button variant="outline" onClick={() => router.push('/pricing')}>
          Manage Subscription
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

**Best For**: Quick overview and action from main dashboard

---

### 6. **Settings Page Link** (RECOMMENDED TO ADD)
**Location**: Could be added to `/settings`

- Add a "Subscription & Billing" section
- Show current plan status
- Link to `/pricing` for upgrades or changes

**Best For**: Users managing account preferences

---

## User Journey Scenarios

### New User
1. **Sign up** → Auto-enrolled in 15-day trial
2. **See trial banner** at top showing "15 days left"
3. **Explore features** with full access
4. **Click "Upgrade Now"** in banner or sidebar anytime
5. **Complete Paddle checkout** → Active subscriber

### Trial User (Mid-Trial)
1. **Login** → See trial banner "X days left"
2. **Click "Subscription"** in sidebar to check plan
3. **View pricing page** → Upgrade if ready
4. **Continue trial** → Full access until expiration

### Expired Trial User
1. **Login** → Blocked by Subscription Gate
2. **See "Your Trial Has Expired"** screen
3. **Click "View Pricing & Subscribe"**
4. **Complete checkout** → Access restored

### Active Subscriber
1. **Login** → See "Pro Subscriber" badge in top banner (subtle)
2. **Access all features** without restrictions
3. **Visit `/pricing`** anytime to manage subscription
4. **Manage billing** through Paddle portal

---

## Visual Hierarchy

### High Priority (Always Visible)
1. ✅ Trial Status Banner (trial users only)
2. ✅ Sidebar "Subscription" link (all users)

### Medium Priority (Contextual)
3. ✅ Subscription Gate (expired trials)
4. 🔲 Dashboard Widget (suggested)

### Low Priority (On-Demand)
5. 🔲 Settings Page Section (suggested)
6. ✅ Direct URL access

---

## Conversion Touchpoints

### Before Trial Expires
- **Day 15-11**: Subtle banner, no pressure
- **Day 10-6**: "Upgrade Now" button more prominent
- **Day 5-1**: Urgent messaging "Only X days left!"

### At Trial Expiration
- **Day 0**: Full screen gate, must upgrade to continue

### After Subscription
- **Day 1+**: "Pro Subscriber" badge, manage link available

---

## Implementation Checklist

### ✅ Completed
- [x] Pricing page integrated in app layout
- [x] Sidebar "Subscription" navigation link
- [x] Trial status banner (top of page)
- [x] Subscription gate for expired trials
- [x] Active subscriber badge
- [x] Direct URL access to /pricing

### 🔲 Recommended Next Steps
- [ ] Add subscription widget to dashboard
- [ ] Add subscription section to settings page
- [ ] Add email reminders (Day 10, Day 5, Day 1)
- [ ] Add in-app notifications for trial milestones
- [ ] Add "Manage Subscription" link for active subscribers (Paddle portal)

---

## Best Practices

### For Trial Users
- **Remind, Don't Nag**: Show trial status subtly until last 5 days
- **Highlight Value**: Show what they'll lose if trial expires
- **Make Upgrade Easy**: One-click access from any page

### For Active Subscribers
- **Show Appreciation**: "Pro Subscriber" badge
- **Easy Management**: Clear path to billing portal
- **No Interruptions**: Minimal subscription-related UI

### For Expired Users
- **Block Access**: Clear gate preventing app use
- **Show What's Missing**: List features they can't access
- **Simple Recovery**: One button to upgrade and regain access

---

## Analytics Tracking (Recommended)

Track these events for optimization:

```javascript
// Trial banner clicks
trackEvent('trial_banner_click', { days_remaining: X })

// Sidebar subscription clicks
trackEvent('sidebar_subscription_click', { user_status: 'trial' })

// Subscription gate views
trackEvent('subscription_gate_view', { reason: 'trial_expired' })

// Upgrade button clicks
trackEvent('upgrade_button_click', { source: 'banner|sidebar|gate' })

// Checkout completions
trackEvent('checkout_complete', { plan: 'professional' })
```

---

## Summary

**Main Entry Points**:
1. 🏆 **Trial Banner** - Most visible, time-sensitive
2. 🏆 **Sidebar Link** - Always accessible, neutral
3. 🏆 **Subscription Gate** - Automatic conversion trigger

**Conversion Strategy**:
- Early trial: Passive reminders
- Mid trial: Clear upgrade path
- Late trial: Urgent messaging
- Expired: Gate + immediate upgrade CTA

All entry points lead to the same integrated `/pricing` page within the app, ensuring consistent branding and user experience.
