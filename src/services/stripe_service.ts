import log from 'electron-log';
import { getSupabaseClient } from '../lib/supabase';
import { updateCreditsOnTierChange } from './credit_service';
import { getMonthlyCredits } from '../utils/credit_costs';

const logger = log.scope('stripe');

// Lazy load Stripe to avoid requiring it if not installed
let Stripe: any = null;
let stripeLoaded = false;

async function loadStripe(): Promise<typeof import('stripe').default> {
  if (!stripeLoaded) {
    try {
      Stripe = (await import('stripe')).default;
      stripeLoaded = true;
      logger.info('Stripe module loaded');
    } catch (error) {
      logger.warn('Stripe module not available. Stripe features will be disabled.');
      stripeLoaded = true; // Mark as loaded to avoid repeated attempts
      throw new Error('Stripe module not installed. Run: npm install stripe');
    }
  }
  if (!Stripe) {
    throw new Error('Stripe module not installed. Run: npm install stripe');
  }
  return Stripe;
}

// Initialize Stripe client
let stripeClient: any = null;

export async function initializeStripe(secretKey: string): Promise<void> {
  if (!secretKey) {
    throw new Error('Stripe secret key is required');
  }
  const StripeClass = await loadStripe();
  stripeClient = new StripeClass(secretKey, {
    apiVersion: '2024-11-20.acacia',
  });
  logger.info('Stripe client initialized');
}

export function getStripeClient(): any {
  if (!stripeClient) {
    throw new Error('Stripe not initialized. Call initializeStripe first.');
  }
  return stripeClient;
}

export interface CreateCheckoutSessionParams {
  customerId?: string;
  customerEmail: string;
  priceId: string;
  userId: string;
  trialDays?: number;
}

export interface SubscriptionStatus {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  planId: string;
  planName: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient();
  const supabase = getSupabaseClient();

  try {
    // Get or create Stripe customer
    let customerId = params.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: params.customerEmail,
        metadata: {
          userId: params.userId,
        },
      });
      customerId = customer.id;

      // Update profile with customer ID
      if (supabase) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', params.userId);

        if (updateError) {
          logger.error('Failed to update profile with customer ID:', updateError);
        }
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL || 'applaa://subscription/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'applaa://subscription/cancel'}`,
      metadata: {
        userId: params.userId,
      },
    };

    // Add trial period if specified
    if (params.trialDays && params.trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: params.trialDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info('Checkout session created:', session.id);

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error: any) {
    logger.error('Failed to create checkout session:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripeClient();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info('Portal session created:', session.id);

    return {
      url: session.url,
    };
  } catch (error: any) {
    logger.error('Failed to create portal session:', error);
    throw new Error(`Failed to create portal session: ${error.message}`);
  }
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionStatus | null> {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer'],
    });

    return mapStripeSubscriptionToStatus(subscription);
  } catch (error: any) {
    logger.error('Failed to get subscription:', error);
    return null;
  }
}

/**
 * Get subscription by customer ID
 */
export async function getSubscriptionByCustomer(customerId: string): Promise<SubscriptionStatus | null> {
  const stripe = getStripeClient();

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    return mapStripeSubscriptionToStatus(subscriptions.data[0]);
  } catch (error: any) {
    logger.error('Failed to get subscription by customer:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<SubscriptionStatus> {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    logger.info('Subscription canceled:', subscriptionId);

    return mapStripeSubscriptionToStatus(subscription);
  } catch (error: any) {
    logger.error('Failed to cancel subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Resume subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<SubscriptionStatus> {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info('Subscription resumed:', subscriptionId);

    return mapStripeSubscriptionToStatus(subscription);
  } catch (error: any) {
    logger.error('Failed to resume subscription:', error);
    throw new Error(`Failed to resume subscription: ${error.message}`);
  }
}

/**
 * Map Stripe subscription to our SubscriptionStatus format
 */
function mapStripeSubscriptionToStatus(subscription: any): SubscriptionStatus {
  const price = subscription.items.data[0]?.price;
  const planName = price?.metadata?.plan_name || 'pro';

  return {
    id: subscription.id,
    status: subscription.status as SubscriptionStatus['status'],
    planId: price?.id || '',
    planName,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
  };
}

/**
 * Determine subscription tier from plan name or metadata
 */
function getTierFromPlan(planName: string, status: string): 'free' | 'pro' | 'ultra' | 'business' {
  if (status !== 'active' && status !== 'trialing') {
    return 'free';
  }

  const planLower = planName.toLowerCase();
  if (planLower.includes('ultra')) {
    return 'ultra';
  }
  if (planLower.includes('business')) {
    return 'business';
  }
  if (planLower.includes('pro')) {
    return 'pro';
  }
  
  // Default to pro for active subscriptions
  return 'pro';
}

/**
 * Sync subscription from Stripe to database
 */
export async function syncSubscriptionToDatabase(
  subscription: any,
  userId: string
): Promise<void> {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    logger.error('Supabase client not available, cannot sync subscription:', error);
    throw new Error('Supabase client not available');
  }
  
  const status = mapStripeSubscriptionToStatus(subscription);

  try {
    // Upsert subscription
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        status: status.status,
        plan_id: status.planId,
        plan_name: status.planName,
        current_period_start: status.currentPeriodStart.toISOString(),
        current_period_end: status.currentPeriodEnd.toISOString(),
        trial_start: status.trialStart?.toISOString() || null,
        trial_end: status.trialEnd?.toISOString() || null,
        cancel_at_period_end: status.cancelAtPeriodEnd,
        canceled_at: status.canceledAt?.toISOString() || null,
      }, {
        onConflict: 'stripe_subscription_id',
      });

    if (error) {
      logger.error('Failed to sync subscription to database:', error);
      throw error;
    }

    // Get current tier before updating
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const oldTier = (currentProfile?.subscription_tier as any) || 'free';
    
    // Determine new tier from plan name
    const newTier = getTierFromPlan(status.planName, status.status);
    
    // Update profile subscription tier
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: newTier,
        trial_start: status.trialStart?.toISOString() || null,
        trial_end: status.trialEnd?.toISOString() || null,
      })
      .eq('id', userId);

    if (profileError) {
      logger.error('Failed to update profile subscription tier:', profileError);
    } else {
      // Update credits if tier changed
      if (oldTier !== newTier) {
        try {
          const creditUpdate = await updateCreditsOnTierChange(userId, newTier, oldTier);
          logger.info(`Credits updated on tier change: ${oldTier} -> ${newTier}, added ${creditUpdate.creditsAdded} credits, new balance: ${creditUpdate.newBalance}`);
        } catch (creditError: any) {
          logger.error('Failed to update credits on tier change:', creditError);
          // Don't throw - subscription tier was updated successfully, credit update can be retried
        }
      }
    }

    logger.info('Subscription synced to database:', subscription.id);
  } catch (error: any) {
    logger.error('Failed to sync subscription:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): any {
  const stripe = getStripeClient();

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}
