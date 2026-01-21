# Premium Subscription System Implementation

## Overview

This document describes the complete premium subscription system implementation with Stripe integration and Google AdSense for free users.

## Architecture

The subscription system consists of:

1. **Database Schema** - Supabase tables for subscriptions and user profiles
2. **Stripe Service** - Backend service for Stripe API interactions
3. **IPC Handlers** - Main process handlers for subscription operations
4. **React Hooks** - Frontend hooks for subscription management
5. **UI Components** - Subscription dialogs and management interfaces
6. **AdSense Integration** - Google AdSense components for free users
7. **Feature Gates** - Updated to use subscription system

## Database Schema

### Subscriptions Table

Created in `supabase_migrations/create_subscriptions_table.sql`:

- Stores Stripe subscription data
- Links to user profiles via `user_id`
- Tracks subscription status, periods, and trial information
- Includes RLS policies for security

### Profiles Table Updates

Updated in `supabase_migrations/add_stripe_fields_to_profiles.sql`:

- Added `stripe_customer_id` field
- Added `trial_start` and `trial_end` fields
- Updated database types in `src/lib/supabase.ts`

## Stripe Integration

### Service Layer

**File**: `src/services/stripe_service.ts`

Key functions:
- `initializeStripe()` - Initialize Stripe client
- `createCheckoutSession()` - Create checkout session for new subscriptions
- `createPortalSession()` - Create customer portal session
- `getSubscription()` - Retrieve subscription details
- `cancelSubscription()` - Cancel subscription
- `resumeSubscription()` - Resume canceled subscription
- `syncSubscriptionToDatabase()` - Sync Stripe data to Supabase
- `verifyWebhookSignature()` - Verify Stripe webhook signatures

### IPC Handlers

**File**: `src/ipc/handlers/subscription_handlers.ts`

Handlers registered in `src/ipc/ipc_host.ts`:
- `subscription:initialize` - Initialize Stripe from secret key
- `subscription:initialize-from-settings` - Initialize from user settings
- `subscription:get-current` - Get current user's subscription
- `subscription:create-checkout` - Create checkout session
- `subscription:create-portal` - Create portal session
- `subscription:cancel` - Cancel subscription
- `subscription:resume` - Resume subscription
- `subscription:webhook` - Handle Stripe webhooks

### IPC Client

**File**: `src/ipc/ipc_client.ts`

Added subscription methods:
- `subscriptionInitialize()`
- `subscriptionInitializeFromSettings()`
- `subscriptionGetCurrent()`
- `subscriptionCreateCheckout()`
- `subscriptionCreatePortal()`
- `subscriptionCancel()`
- `subscriptionResume()`
- `subscriptionWebhook()`

### Preload Whitelist

**File**: `src/preload.ts`

Added subscription channels to IPC whitelist.

## React Integration

### Hooks

**File**: `src/hooks/useSubscription.ts`

- `useSubscription()` - Main subscription hook
- `useIsPro()` - Check if user has Pro subscription
- `useTrialStatus()` - Get trial status and days remaining

### Components

**Subscription Dialog** (`src/components/subscription/SubscriptionDialog.tsx`):
- Displays Free and Pro plans
- Shows feature comparison
- Handles checkout session creation
- Displays current subscription status

**Subscription Management** (`src/components/subscription/SubscriptionManagement.tsx`):
- Full subscription management interface
- View current plan and status
- Manage billing through Stripe portal
- Cancel/resume subscriptions
- Trial status display

## Google AdSense Integration

**File**: `src/components/ads/AdSense.tsx`

Components:
- `AdSense` - Base AdSense component
- `AdSenseSidebar` - Sidebar ad placement
- `AdSenseBanner` - Banner ad placement
- `AdSenseInContent` - In-content ad placement

**Features**:
- Only displays ads for free users
- Automatically hides for Pro users
- Supports multiple ad formats
- Responsive design

**Configuration**:
- Replace `YOUR_PUBLISHER_ID` with actual AdSense publisher ID
- Replace `YOUR_*_AD_SLOT` with actual ad slot IDs
- Add AdSense script to HTML if not already present

## Feature Gating

**File**: `src/components/ProFeatureGate.tsx`

Updated to use subscription system:
- Uses `useIsPro()` hook instead of settings
- Shows subscription dialog on upgrade
- Supports multiple display variants (card, inline, banner)
- Higher-order component `withProGate()` for wrapping Pro features

## Usage Examples

### Check Subscription Status

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const { isPro, tier, subscription } = useSubscription();
  
  if (isPro) {
    // Show Pro features
  }
}
```

### Gate a Feature

```typescript
import { ProFeatureGate } from '@/components/ProFeatureGate';

function MyComponent() {
  return (
    <ProFeatureGate
      feature="Advanced AI Models"
      description="Access GPT-4 and Claude Sonnet"
    >
      {/* Pro feature content */}
    </ProFeatureGate>
  );
}
```

### Add AdSense Ads

```typescript
import { AdSenseSidebar, AdSenseBanner } from '@/components/ads/AdSense';

function MyLayout() {
  return (
    <div>
      <AdSenseBanner />
      <div className="flex">
        <main>Content</main>
        <aside>
          <AdSenseSidebar />
        </aside>
      </div>
    </div>
  );
}
```

## Environment Variables

Required environment variables:

- `STRIPE_SECRET_KEY` - Stripe secret key (for backend)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for frontend, if needed)
- `STRIPE_PRO_PRICE_ID` - Stripe price ID for Pro plan
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `APP_URL` - Application URL for redirects

## Webhook Setup

1. Create a webhook endpoint in your backend
2. Configure Stripe webhook to point to your endpoint
3. Handle webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

Example webhook handler:

```typescript
const event = await verifyWebhookSignature(payload, signature, secret);
await handleWebhookEvent(event);
```

## Testing

### Test Stripe Integration

1. Use Stripe test mode
2. Use test API keys
3. Use test card numbers (e.g., `4242 4242 4242 4242`)
4. Monitor webhook events in Stripe dashboard

### Test Subscription Flow

1. Create checkout session
2. Complete payment with test card
3. Verify subscription created in database
4. Test cancel/resume functionality
5. Test webhook handling

## Next Steps

1. **Configure AdSense**:
   - Get AdSense publisher ID
   - Create ad units
   - Update component with actual IDs

2. **Set Environment Variables**:
   - Add Stripe keys to settings
   - Configure price IDs
   - Set up webhook endpoint

3. **Add Subscription Settings**:
   - Add Stripe configuration to settings UI
   - Allow users to enter API keys
   - Store securely using keytar

4. **Integrate Ads**:
   - Add AdSense components to main layout
   - Place sidebar ads in appropriate locations
   - Add banner ads to header/footer

5. **Update Feature Gates**:
   - Identify Pro-only features
   - Wrap with ProFeatureGate components
   - Test gating logic

6. **Webhook Endpoint**:
   - Create secure webhook endpoint
   - Handle all subscription events
   - Update database accordingly

## Security Considerations

1. **API Keys**: Store Stripe secret key securely (use keytar)
2. **Webhooks**: Always verify webhook signatures
3. **RLS**: Ensure Row Level Security is enabled on Supabase tables
4. **Validation**: Validate all user inputs
5. **Error Handling**: Don't expose sensitive error messages

## Support

For issues or questions:
- Check Stripe documentation
- Review Supabase RLS policies
- Verify webhook configuration
- Check browser console for errors
