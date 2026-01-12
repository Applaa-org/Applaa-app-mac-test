import { ipcMain } from 'electron';
import log from 'electron-log';
import {
  initializeStripe,
  getStripeClient,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  getSubscriptionByCustomer,
  cancelSubscription,
  resumeSubscription,
  syncSubscriptionToDatabase,
  verifyWebhookSignature,
} from '../../services/stripe_service';
import { getSupabaseClient, getSupabaseAuth } from '../../lib/supabase';
import { readSettings } from '../../main/settings';

const logger = log.scope('subscription');

export function registerSubscriptionHandlers() {
  // Initialize Stripe
  ipcMain.handle('subscription:initialize', async (_, secretKey: string) => {
    try {
      initializeStripe(secretKey);
      logger.info('Stripe initialized');
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to initialize Stripe:', error);
      throw new Error(`Failed to initialize Stripe: ${error.message}`);
    }
  });

  // Initialize Stripe from settings
  ipcMain.handle('subscription:initialize-from-settings', async () => {
    try {
      const settings = readSettings();
      const stripeSecretKey = settings.providerSettings?.stripe?.apiKey?.value;

      if (!stripeSecretKey) {
        throw new Error('Stripe secret key not found in settings');
      }

      initializeStripe(stripeSecretKey);
      logger.info('Stripe initialized from settings');
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to initialize Stripe from settings:', error);
      throw new Error(`Failed to initialize Stripe: ${error.message}`);
    }
  });

  // Get current user's subscription
  ipcMain.handle('subscription:get-current', async () => {
    try {
      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();

      if (!user) {
        return { subscription: null, isPro: false };
      }

      const supabase = getSupabaseClient();
      
      // Get profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_tier, trial_start, trial_end')
        .eq('id', user.id)
        .single();

      if (profileError) {
        logger.error('Failed to get profile:', profileError);
        return { subscription: null, isPro: false };
      }

      // If no customer ID, user is on free tier
      if (!profile.stripe_customer_id) {
        return {
          subscription: null,
          isPro: false,
          tier: 'free',
          trialStart: profile.trial_start,
          trialEnd: profile.trial_end,
        };
      }

      // Get subscription from Stripe
      try {
        const subscription = await getSubscriptionByCustomer(profile.stripe_customer_id);
        
        if (!subscription) {
          return {
            subscription: null,
            isPro: false,
            tier: 'free',
          };
        }

        const isPro = subscription.status === 'active' || subscription.status === 'trialing';

        return {
          subscription: {
            id: subscription.id,
            status: subscription.status,
            planName: subscription.planName,
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            trialStart: subscription.trialStart?.toISOString(),
            trialEnd: subscription.trialEnd?.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt?.toISOString(),
          },
          isPro,
          tier: isPro ? 'pro' : 'free',
        };
      } catch (stripeError: any) {
        logger.error('Failed to get subscription from Stripe:', stripeError);
        // Fallback to profile subscription_tier
        return {
          subscription: null,
          isPro: profile.subscription_tier === 'pro',
          tier: profile.subscription_tier || 'free',
        };
      }
    } catch (error: any) {
      logger.error('Failed to get current subscription:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  });

  // Create checkout session
  ipcMain.handle('subscription:create-checkout', async (_, { priceId, trialDays }: { priceId: string; trialDays?: number }) => {
    try {
      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Failed to get user profile');
      }

      const result = await createCheckoutSession({
        customerId: profile.stripe_customer_id || undefined,
        customerEmail: profile.email,
        priceId,
        userId: user.id,
        trialDays,
      });

      return { success: true, ...result };
    } catch (error: any) {
      logger.error('Failed to create checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  });

  // Create portal session
  ipcMain.handle('subscription:create-portal', async (_, returnUrl: string) => {
    try {
      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !profile.stripe_customer_id) {
        throw new Error('No active subscription found');
      }

      const result = await createPortalSession(profile.stripe_customer_id, returnUrl);

      return { success: true, ...result };
    } catch (error: any) {
      logger.error('Failed to create portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  });

  // Cancel subscription
  ipcMain.handle('subscription:cancel', async (_, { subscriptionId, cancelAtPeriodEnd }: { subscriptionId: string; cancelAtPeriodEnd?: boolean }) => {
    try {
      const result = await cancelSubscription(subscriptionId, cancelAtPeriodEnd ?? true);
      
      // Sync to database
      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();
      if (user) {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToDatabase(subscription, user.id);
      }

      return {
        success: true,
        subscription: {
          id: result.id,
          status: result.status,
          cancelAtPeriodEnd: result.cancelAtPeriodEnd,
        },
      };
    } catch (error: any) {
      logger.error('Failed to cancel subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  });

  // Resume subscription
  ipcMain.handle('subscription:resume', async (_, subscriptionId: string) => {
    try {
      const result = await resumeSubscription(subscriptionId);
      
      // Sync to database
      const auth = getSupabaseAuth();
      const user = await auth.getCurrentUser();
      if (user) {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionToDatabase(subscription, user.id);
      }

      return {
        success: true,
        subscription: {
          id: result.id,
          status: result.status,
          cancelAtPeriodEnd: result.cancelAtPeriodEnd,
        },
      };
    } catch (error: any) {
      logger.error('Failed to resume subscription:', error);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  });

  // Handle Stripe webhook
  ipcMain.handle('subscription:webhook', async (_, { payload, signature, secret }: { payload: string; signature: string; secret: string }) => {
    try {
      const event = verifyWebhookSignature(payload, signature, secret);
      const stripe = getStripeClient();

      logger.info('Webhook received:', event.type);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;

          if (userId && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            await syncSubscriptionToDatabase(subscription, userId);
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;

          // Find user by customer ID
          const supabase = getSupabaseClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            await syncSubscriptionToDatabase(subscription, profile.id);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;

          // Find user by customer ID
          const supabase = getSupabaseClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            // Update profile to free tier
            await supabase
              .from('profiles')
              .update({ subscription_tier: 'free' })
              .eq('id', profile.id);

            // Delete subscription record
            await supabase
              .from('subscriptions')
              .delete()
              .eq('stripe_subscription_id', subscription.id);
          }
          break;
        }

        default:
          logger.info('Unhandled webhook event type:', event.type);
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to handle webhook:', error);
      throw new Error(`Failed to handle webhook: ${error.message}`);
    }
  });
}
