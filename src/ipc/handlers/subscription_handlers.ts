import { ipcMain } from 'electron';
import { shell } from 'electron';
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
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';
import { readSettings, writeSettings } from '../../main/settings';

const logger = log.scope('subscription');

export function registerSubscriptionHandlers() {
  // Initialize Stripe
  ipcMain.handle('subscription:initialize', async (_, secretKey: string) => {
    try {
      await initializeStripe(secretKey);
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

      await initializeStripe(stripeSecretKey);
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

  // Helper function to get Supabase admin client (service role)
  function getSupabaseAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    return createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // Redirect to subscription page
  ipcMain.handle('subscription:redirect-to-subscribe', async () => {
    try {
      let userEmail: string;
      let userId: string;

      // Check Supabase authentication first
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();

      if (supabaseUser) {
        // User is authenticated via Supabase
        const adminClient = getSupabaseAdminClient();
        
        // Try to get profile by Supabase user ID first
        let { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('email, id')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          logger.error('Failed to get profile from Supabase:', profileError);
          throw new Error(`Failed to get user profile: ${profileError.message}`);
        }

        // If not found by ID, try by email or username
        if (!profile) {
          const identifier = supabaseUser.email || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.preferred_username;
          
          if (identifier) {
            profile = await auth.getProfileByEmailOrUsername(identifier);
          }
        }

        if (!profile) {
          // Profile doesn't exist - create it automatically using auth data
          logger.info('Profile not found, creating from Supabase auth data');
          
          const userEmail = supabaseUser.email;
          if (!userEmail) {
            throw new Error('User email not found in authentication data.');
          }

          // Create profile using admin client (bypasses RLS)
          const { data: newProfile, error: createError } = await adminClient
            .from('profiles')
            .insert({
              id: supabaseUser.id,
              email: userEmail,
              full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
              subscription_tier: 'free',
            })
            .select('email, id')
            .single();

          if (createError) {
            logger.error('Failed to create profile:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }

          profile = newProfile;
          logger.info('Profile created successfully');
        }

        userEmail = profile.email;
        userId = profile.id;
      } else {
        // Check WordPress authentication (fallback)
        // All WordPress users are already in Supabase, so just look them up
        const settings = readSettings();
        const wordpressAuth = settings.wordpressAuth;

        if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
          throw new Error('User not authenticated. Please sign in to upgrade.');
        }

        // Get email from WordPress user
        userEmail = wordpressAuth.user.email;
        
        // Look up existing profile in Supabase by email or username
        // Since all WordPress users are already in Supabase, profile should exist
        let profile = await auth.getProfileByEmailOrUsername(userEmail);
        
        // If not found by email, try by WordPress username
        if (!profile && wordpressAuth.user.username) {
          profile = await auth.getProfileByEmailOrUsername(wordpressAuth.user.username);
        }
        
        if (!profile) {
          logger.error('WordPress user profile not found in Supabase:', {
            email: userEmail,
            username: wordpressAuth.user.username,
          });
          throw new Error('User profile not found in database. Please contact support.');
        }

        userId = profile.id;
        logger.info('Found WordPress user profile in Supabase:', userId);
      }

      // Build redirect URL with user parameters
      const params = new URLSearchParams({
        email: userEmail,
        userId: userId,
        returnUrl: 'applaa://subscription/success',
      });

      const subscribeUrl = `http://localhost:3000/subscribe?${params.toString()}`;
      
      logger.info(`Redirecting to subscription page: ${subscribeUrl}`);
      await shell.openExternal(subscribeUrl);

      return { success: true, url: subscribeUrl };
    } catch (error: any) {
      logger.error('Failed to redirect to subscribe:', error);
      throw new Error(`Failed to redirect: ${error.message}`);
    }
  });

  // Sync subscription from Supabase
  ipcMain.handle('subscription:sync-from-supabase', async () => {
    try {
      let profile: { subscription_tier: string | null } | null = null;

      // Check Supabase authentication first
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();

      if (supabaseUser) {
        // User is authenticated via Supabase
        const adminClient = getSupabaseAdminClient();
        
        // Try to get profile by Supabase user ID first
        let { data: profileData, error: profileError } = await adminClient
          .from('profiles')
          .select('subscription_tier')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          logger.error('Failed to get profile from Supabase:', profileError);
          throw new Error(`Failed to sync subscription: ${profileError.message}`);
        }

        // If not found by ID, try by email or username
        if (!profileData) {
          const identifier = supabaseUser.email || supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.preferred_username;
          
          if (identifier) {
            const fullProfile = await auth.getProfileByEmailOrUsername(identifier);
            if (fullProfile) {
              profileData = { subscription_tier: fullProfile.subscription_tier };
            }
          }
        }

        if (!profileData) {
          // Profile doesn't exist - create it automatically using auth data
          logger.info('Profile not found during sync, creating from Supabase auth data');
          
          const userEmail = supabaseUser.email;
          if (!userEmail) {
            throw new Error('User email not found in authentication data.');
          }

          // Create profile using admin client (bypasses RLS)
          const { data: newProfile, error: createError } = await adminClient
            .from('profiles')
            .insert({
              id: supabaseUser.id,
              email: userEmail,
              full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
              subscription_tier: 'free',
            })
            .select('subscription_tier')
            .single();

          if (createError) {
            logger.error('Failed to create profile during sync:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }

          profileData = newProfile;
          logger.info('Profile created successfully during sync');
        }

        profile = profileData;
      } else {
        // Check WordPress authentication (fallback)
        // All WordPress users are already in Supabase, so just look them up
        const settings = readSettings();
        const wordpressAuth = settings.wordpressAuth;

        if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
          throw new Error('User not authenticated. Please sign in to sync subscription.');
        }

        // Get email from WordPress user
        const userEmail = wordpressAuth.user.email;
        
        // Look up existing profile in Supabase by email or username
        // Since all WordPress users are already in Supabase, profile should exist
        let profileData = await auth.getProfileByEmailOrUsername(userEmail);
        
        // If not found by email, try by WordPress username
        if (!profileData && wordpressAuth.user.username) {
          profileData = await auth.getProfileByEmailOrUsername(wordpressAuth.user.username);
        }
        
        if (!profileData) {
          logger.error('WordPress user profile not found in Supabase:', {
            email: userEmail,
            username: wordpressAuth.user.username,
          });
          throw new Error('User profile not found in database. Please contact support.');
        }

        profile = { subscription_tier: profileData.subscription_tier };
        logger.info('Found WordPress user profile in Supabase:', profileData.id);
      }

      if (!profile) {
        throw new Error('User profile not found and could not be created');
      }

      // Update local settings based on database subscription_tier
      const tier = profile.subscription_tier === 'pro' ? 'pro' : 'free';
      writeSettings({ userTier: tier });

      logger.info(`Subscription synced from Supabase. Tier: ${tier}`);

      return {
        success: true,
        tier,
        isPro: tier === 'pro',
      };
    } catch (error: any) {
      logger.error('Failed to sync subscription from Supabase:', error);
      throw new Error(`Failed to sync subscription: ${error.message}`);
    }
  });
}
