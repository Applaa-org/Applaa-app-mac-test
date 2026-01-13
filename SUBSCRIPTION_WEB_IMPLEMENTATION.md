# Subscription Management Web Implementation Guide

This guide provides detailed instructions for implementing subscription management in your Next.js application at `applaa.com/subscribe`.

## Overview

The Electron app redirects users to `applaa.com/subscribe` with URL parameters containing user information. Your Next.js application needs to:

1. Receive and validate the user parameters
2. Display subscription plans
3. Handle subscription selection
4. Update the Supabase database
5. Redirect back to the Electron app

## URL Parameters

When users are redirected from the Electron app, they arrive with these query parameters:

- **email**: User's email address (required)
- **userId**: UUID from the profiles table (required)
- **returnUrl**: Deep link URL to return to the app (optional, defaults to `applaa://subscription/success`)

## Prerequisites

### Supabase Setup

1. **Environment Variables Required:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side)
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations, keep secret!)

2. **Database Tables:**
   - `profiles` table must exist with `subscription_tier` field
   - Table should have RLS (Row Level Security) enabled
   - Service role key should have access to update profiles

### Stripe Setup (Future - Optional)

For future payment integration:
- Stripe account and API keys
- Stripe products and prices configured
- Webhook endpoint for subscription events

## File Structure

Create the following structure in your Next.js app:

```
app/
  subscribe/
    page.tsx              # Main subscription page
    success/
      page.tsx            # Success page after subscription
  api/
    subscription/
      update/
        route.ts          # API route to update subscription tier
      checkout/
        route.ts          # API route for Stripe checkout (future)
lib/
  supabase/
    server.ts             # Supabase server client (uses service role)
    client.ts             # Supabase client for browser (uses anon key)
  stripe.ts               # Stripe configuration (future)
types/
  supabase.ts             # TypeScript types for Supabase database
```

## Implementation Details

### 1. Supabase Server Client

**Location:** `lib/supabase/server.ts`

**Purpose:** Create a Supabase client that uses the service role key for server-side operations. This bypasses RLS and allows updating user profiles.

**Key Points:**
- Use service role key (not anon key)
- Disable auto-refresh token and session persistence
- This client should only be used in API routes, never exposed to the browser

### 2. API Route: Update Subscription

**Location:** `app/api/subscription/update/route.ts`

**Method:** POST

**Purpose:** Update the user's subscription tier in the Supabase profiles table.

**Request Body:**
- `userId` (string, required) - UUID of the user profile
- `subscriptionTier` (string, required) - Either "free" or "pro"

**Validation:**
- Check that both userId and subscriptionTier are provided
- Validate that subscriptionTier is either "free" or "pro"
- Return 400 error if validation fails

**Database Update:**
- Use Supabase server client to update the profiles table
- Update `subscription_tier` field
- Update `updated_at` timestamp
- Match by `id` field (userId)

**Response:**
- Success: Return 200 with updated profile data
- Error: Return appropriate status code (400, 500) with error message

**Error Handling:**
- Log errors for debugging
- Don't expose sensitive error details to client
- Return user-friendly error messages

### 3. Subscription Page Component

**Location:** `app/subscribe/page.tsx`

**Purpose:** Display subscription plans and allow users to select a tier.

**Features:**

1. **URL Parameter Extraction:**
   - Read email, userId, and returnUrl from query parameters
   - Validate that email and userId are present
   - Show error message if parameters are missing

2. **Plan Display:**
   - Show two plans: Free and Pro
   - Display plan features as a list
   - Highlight Pro plan as "Popular" or "Recommended"
   - Show pricing information

3. **Plan Selection:**
   - Each plan has a "Select" or "Upgrade" button
   - On click, call the update API endpoint
   - Show loading state during API call
   - Handle errors gracefully

4. **User Experience:**
   - Display user's email address
   - Show loading spinner during subscription update
   - Display success/error messages
   - Redirect to success page after successful update

**Plan Details:**

**Free Plan:**
- Price: $0
- Features: Up to 3 apps, Basic AI models, Community support

**Pro Plan:**
- Price: $19/month (or your pricing)
- Features: Unlimited apps, All AI models, Deployment to Vercel & EAS, Priority support, Advanced features

### 4. Success Page

**Location:** `app/subscribe/success/page.tsx`

**Purpose:** Confirm subscription update and provide return link to Electron app.

**Features:**

1. **Success Confirmation:**
   - Display success message
   - Show which tier was selected (Free or Pro)
   - Confirm that the account has been updated

2. **Return to App:**
   - If returnUrl is provided, create a button to return to the Electron app
   - Use the returnUrl as a deep link (e.g., `applaa://subscription/success`)
   - Handle cases where deep link doesn't work (show fallback message)

3. **User Experience:**
   - Clear success message
   - Visual confirmation (checkmark icon)
   - Instructions to return to the app

### 5. TypeScript Types

**Location:** `types/supabase.ts`

**Purpose:** Define TypeScript interfaces for Supabase database tables.

**Required Types:**
- Database interface with profiles table structure
- Row, Insert, and Update types for profiles table
- Include all fields: id, email, full_name, subscription_tier, etc.

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** 
- Never commit `.env.local` to version control
- Add it to `.gitignore`
- Service role key should never be exposed to the client

## Security Considerations

### 1. Server-Side Validation
- Always validate userId and subscriptionTier on the server
- Never trust client-side data
- Check that userId exists in the database before updating

### 2. Rate Limiting
- Implement rate limiting on the update API endpoint
- Prevent abuse and spam requests
- Consider using Next.js middleware or a service like Vercel Edge Config

### 3. Input Sanitization
- Sanitize all user inputs
- Validate UUID format for userId
- Check subscriptionTier against allowed values

### 4. Error Handling
- Don't expose sensitive error details (database errors, stack traces)
- Return user-friendly error messages
- Log detailed errors server-side for debugging

### 5. Authentication (Future)
- Consider adding authentication checks
- Verify that the userId matches the authenticated user
- Prevent users from updating other users' subscriptions

## Testing

### 1. Test Subscription Page

Access the page with test parameters:
```
https://applaa.com/subscribe?email=test@example.com&userId=123e4567-e89b-12d3-a456-426614174000&returnUrl=applaa://subscription/success
```

**Test Cases:**
- Missing email parameter
- Missing userId parameter
- Invalid userId format
- Successful subscription update
- Error handling

### 2. Test API Endpoint

Test the update endpoint directly:

**Success Case:**
- Valid userId and subscriptionTier
- Should return 200 with updated profile

**Error Cases:**
- Missing parameters (should return 400)
- Invalid subscriptionTier (should return 400)
- Non-existent userId (should return 404 or 500)
- Database error (should return 500)

### 3. Test Success Page

**Test Cases:**
- With returnUrl parameter
- Without returnUrl parameter
- Deep link functionality
- Fallback message display

## Future Enhancements

### 1. Stripe Integration

When ready to add actual payments:

1. **Stripe Checkout:**
   - Create checkout session API route
   - Redirect to Stripe checkout page
   - Handle successful payment callback

2. **Webhook Handler:**
   - Create webhook endpoint for Stripe events
   - Handle subscription.created, subscription.updated, subscription.deleted
   - Update database based on Stripe events

3. **Subscription Management:**
   - Allow users to cancel subscriptions
   - Handle subscription renewals
   - Manage payment methods

### 2. Email Notifications

- Send confirmation email when subscription is updated
- Send receipt for Pro subscription
- Send reminder emails for trial periods

### 3. Analytics

- Track subscription conversions
- Monitor subscription upgrade/downgrade patterns
- Analyze user behavior on subscription page

### 4. Subscription Management Page

- Allow users to view current subscription
- Cancel subscription
- Update payment method
- View billing history

## Integration with Electron App

### Flow:

1. **User clicks "Upgrade to Pro" in Electron app**
   - Electron app calls `subscription:redirect-to-subscribe` IPC handler
   - Handler gets user email and userId from Supabase auth or WordPress auth
   - Opens browser with URL: `https://applaa.com/subscribe?email=...&userId=...&returnUrl=applaa://subscription/success`

2. **User selects plan on web page**
   - Web page calls `/api/subscription/update` endpoint
   - Endpoint updates `subscription_tier` in Supabase profiles table

3. **User redirected to success page**
   - Success page shows confirmation
   - User clicks "Return to App" button
   - Deep link opens Electron app

4. **User syncs subscription in Electron app**
   - User clicks "Sync Subscription" button in Settings
   - Electron app calls `subscription:sync-from-supabase` IPC handler
   - Handler reads `subscription_tier` from Supabase profiles table
   - Updates local settings with new tier

## Troubleshooting

### Issue: "Missing required parameters" error

**Solution:** 
- Ensure Electron app is passing email and userId in URL
- Check that parameters are properly URL-encoded
- Verify user is authenticated before redirecting

### Issue: "Failed to update subscription" error

**Solution:**
- Check Supabase service role key is correct
- Verify profiles table exists and has subscription_tier field
- Check RLS policies allow service role to update
- Verify userId exists in profiles table

### Issue: Deep link doesn't work

**Solution:**
- Ensure returnUrl is properly formatted (applaa://...)
- Check Electron app has proper deep link handler registered
- Provide fallback message to user
- Consider using a different return mechanism

### Issue: Subscription not syncing in Electron app

**Solution:**
- Verify subscription_tier was updated in Supabase
- Check Electron app is reading from correct table
- Ensure sync handler is using admin client (service role)
- Verify user authentication in Electron app

## Best Practices

1. **Always validate on server:** Never trust client-side data
2. **Use service role key carefully:** Only in server-side code, never expose to browser
3. **Handle errors gracefully:** Provide user-friendly error messages
4. **Log important events:** Track subscription updates for debugging
5. **Test thoroughly:** Test all error cases and edge cases
6. **Monitor performance:** Track API response times and database query performance
7. **Keep it simple:** Start with basic functionality, add features incrementally

## Support

For issues or questions:
- Check Supabase dashboard for database errors
- Review server logs for API errors
- Test with different user accounts
- Verify environment variables are set correctly
