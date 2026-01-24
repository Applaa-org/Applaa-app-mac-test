import { ipcMain } from 'electron';
import log from 'electron-log';
import {
  checkCredits,
  deductCredits,
  getCreditBalance,
  getUsageHistory,
  resetMonthlyCredits,
} from '../../services/credit_service';
import { checkAndResetCredits } from '../../services/credit_reset_service';
import { getSupabaseAuth } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';
import { readSettings } from '../../main/settings';
import { SUPABASE_CONFIG } from '../../config/supabase.config';

const logger = log.scope('credit-handlers');

// Helper function to get Supabase admin client (bypasses RLS)
function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_CONFIG.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_CONFIG.URL;

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

// Helper to get user ID from Supabase or WordPress auth
async function getUserId(): Promise<string> {
  const auth = getSupabaseAuth();
  const supabaseUser = await auth.getCurrentUser();

  if (supabaseUser) {
    // ✅ Check if profile exists for Supabase user by ID first
    const adminClient = getSupabaseAdminClient();
    let { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', supabaseUser.id)
      .maybeSingle();
    
    // ✅ FIX: If not found by ID, try by email (profile might exist with different ID)
    if (!profile && supabaseUser.email) {
      logger.info('Profile not found by Supabase user ID, trying email lookup:', {
        userId: supabaseUser.id,
        email: supabaseUser.email,
      });
      
      const existingProfile = await auth.getProfileByEmailOrUsername(supabaseUser.email);
      if (existingProfile) {
        logger.info('✅ Found existing profile by email (different ID):', {
          supabaseUserId: supabaseUser.id,
          profileId: existingProfile.id,
          email: existingProfile.email,
        });
        // Return the existing profile's ID instead of Supabase user ID
        return existingProfile.id;
      }
    }
    
    // ✅ Only create new profile if not found by ID or email
    if (!profile) {
      logger.warn('Old Supabase user without profile detected, creating new profile:', {
        userId: supabaseUser.id,
        email: supabaseUser.email,
      });
      
      try {
        const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null;
        
        const { error: createError } = await adminClient
          .from('profiles')
          .insert({
            id: supabaseUser.id,
            email: supabaseUser.email || 'unknown@example.com',
            full_name: fullName,
            subscription_tier: 'free',
            monthly_credits: 100,
            remaining_credits: 100,
            total_credits_used: 0,
            total_tokens_used: 0,
            credits_last_reset: new Date().toISOString(),
          });
        
        if (createError) {
          logger.error('Failed to auto-create profile for Supabase user:', createError);
          throw new Error(`Failed to create user profile: ${createError.message}`);
        }
        
        logger.info('✅ Profile auto-created for old Supabase user in credit handler:', {
          userId: supabaseUser.id,
          email: supabaseUser.email,
        });
      } catch (createError) {
        logger.error('Failed to auto-create profile for old Supabase user:', createError);
        throw new Error('User profile not found and failed to create. Please contact support.');
      }
    }
    
    return supabaseUser.id;
  }

  // Fallback to WordPress auth
  const settings = readSettings();
  const wordpressAuth = settings.wordpressAuth;

  if (!wordpressAuth?.isAuthenticated || !wordpressAuth?.user) {
    throw new Error('User not authenticated');
  }

  // Look up profile by email or username
  const userEmail = wordpressAuth.user.email;
  const wordpressUsername = wordpressAuth.user.username;
  const wordpressDisplayName = wordpressAuth.user.display_name;

  let profile = null;

  // Strategy 1: Try by email
  if (userEmail && userEmail !== 'unknown@example.com') {
    profile = await auth.getProfileByEmailOrUsername(userEmail);
  }

  // Strategy 2: Try by display name
  if (!profile && wordpressDisplayName) {
    profile = await auth.getProfileByEmailOrUsername(wordpressDisplayName);
  }

  // Strategy 3: Try by username
  if (!profile && wordpressUsername) {
    profile = await auth.getProfileByEmailOrUsername(wordpressUsername);
  }

  // Strategy 4: Try direct lookup by wordpress_user_id if we have it
  if (!profile && wordpressAuth.user.id) {
    logger.info('Trying Strategy 4: Looking up profile by wordpress_user_id:', wordpressAuth.user.id);
    const adminClient = getSupabaseAdminClient();
    const { data: profileById, error: idError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('wordpress_user_id', wordpressAuth.user.id)
      .maybeSingle();
    
    if (profileById && !idError) {
      logger.info('Found profile by wordpress_user_id:', {
        profileId: profileById.id,
        wordpressUserId: profileById.wordpress_user_id,
      });
      profile = profileById;
    }
  }

  // ✅ AUTO-CREATE: If profile still not found, create a new one for this WordPress user
  if (!profile) {
    logger.info('WordPress user profile not found, creating new profile:', {
      email: userEmail,
      username: wordpressUsername,
      displayName: wordpressDisplayName,
      wordpressUserId: wordpressAuth.user.id,
    });
    
    try {
      const adminClient = getSupabaseAdminClient();
      
      // Generate a unique UUID for the new profile
      const { randomUUID } = await import('crypto');
      const newProfileId = randomUUID();
      
      // Parse capabilities to get WordPress roles
      const capabilities = wordpressAuth.user.capabilities;
      let roles: string[] = [];
      
      if (Array.isArray(capabilities)) {
        roles = capabilities;
      } else if (typeof capabilities === 'object' && capabilities !== null) {
        // Extract role names from capabilities object (keys with truthy values)
        roles = Object.keys(capabilities).filter(key => {
          const value = capabilities[key];
          if (typeof value === 'boolean') return value;
          if (typeof value === 'number') return value !== 0;
          if (typeof value === 'string') return value !== '' && value !== '0' && value !== 'false';
          return false;
        });
      }
      
      // Create new profile
      const { data: newProfile, error: createError } = await adminClient
        .from('profiles')
        .insert({
          id: newProfileId,
          email: userEmail || 'unknown@example.com',
          full_name: wordpressDisplayName || wordpressUsername || null,
          wordpress_user_id: wordpressAuth.user.id,
          wordpress_username: wordpressUsername || null,
          wordpress_display_name: wordpressDisplayName || null,
          wordpress_roles: roles,
          subscription_tier: 'free',
          monthly_credits: 100,
          remaining_credits: 100,
          total_credits_used: 0,
          total_tokens_used: 0,
          credits_last_reset: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (createError) {
        logger.error('Failed to auto-create profile:', createError);
        throw new Error(`Failed to create user profile: ${createError.message}`);
      }
      
      logger.info('✅ Profile auto-created successfully:', {
        profileId: newProfile.id,
        email: newProfile.email,
        wordpressUserId: newProfile.wordpress_user_id,
      });
      
      profile = newProfile;
    } catch (createError) {
      logger.error('Failed to auto-create profile for WordPress user:', createError);
      throw new Error('Failed to create user profile. Please contact support.');
    }
  }

  return profile.id;
}

export function registerCreditHandlers() {
  // Check if user has enough credits
  ipcMain.handle('credit:check', async (_, operationType: string, cost?: number) => {
    try {
      const userId = await getUserId();
      const result = await checkCredits(userId, operationType as any, cost);

      return {
        success: true,
        hasCredits: result.hasCredits,
        remaining: result.remaining,
        required: result.required,
      };
    } catch (error: any) {
      logger.error('Failed to check credits:', error);
      throw new Error(`Failed to check credits: ${error.message}`);
    }
  });

  // Deduct credits from user account
  ipcMain.handle('credit:deduct', async (_, operationType: string, cost?: number, metadata?: Record<string, any>) => {
    try {
      const userId = await getUserId();
      const result = await deductCredits(userId, operationType as any, cost, metadata);

      return {
        success: true,
        remaining: result.remaining,
      };
    } catch (error: any) {
      logger.error('Failed to deduct credits:', error);
      throw new Error(`Failed to deduct credits: ${error.message}`);
    }
  });

  // Get current credit balance
  ipcMain.handle('credit:get-balance', async () => {
    try {
      const userId = await getUserId();
      const balance = await getCreditBalance(userId);

      return {
        success: true,
        balance,
      };
    } catch (error: any) {
      logger.error('Failed to get credit balance:', error);
      throw new Error(`Failed to get credit balance: ${error.message}`);
    }
  });

  // Get usage history
  ipcMain.handle('credit:get-usage', async (_, filters?: {
    operationType?: string;
    appId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {
    try {
      const userId = await getUserId();
      const history = await getUsageHistory(userId, filters);

      return {
        success: true,
        history,
      };
    } catch (error: any) {
      logger.error('Failed to get usage history:', error);
      throw new Error(`Failed to get usage history: ${error.message}`);
    }
  });

  // Reset monthly credits (for testing or manual reset)
  ipcMain.handle('credit:reset', async () => {
    try {
      const userId = await getUserId();
      const result = await resetMonthlyCredits(userId);

      return {
        success: true,
        newBalance: result.newBalance,
      };
    } catch (error: any) {
      logger.error('Failed to reset credits:', error);
      throw new Error(`Failed to reset credits: ${error.message}`);
    }
  });

  // Check and reset credits if needed (call on login)
  ipcMain.handle('credit:check-reset', async () => {
    try {
      const userId = await getUserId();
      const result = await checkAndResetCredits(userId);

      return {
        success: true,
        reset: result.reset,
        newBalance: result.newBalance,
      };
    } catch (error: any) {
      logger.error('Failed to check/reset credits:', error);
      throw new Error(`Failed to check/reset credits: ${error.message}`);
    }
  });

  // Top-up credits (for Pro+ users via Stripe)
  // This is a placeholder - actual implementation would integrate with Stripe
  ipcMain.handle('credit:top-up', async (_, amount: number) => {
    try {
      // TODO: Integrate with Stripe for actual payment processing
      // For now, this is just a placeholder
      throw new Error('Credit top-up not yet implemented. Please upgrade your subscription for more credits.');
    } catch (error: any) {
      logger.error('Failed to top-up credits:', error);
      throw new Error(`Failed to top-up credits: ${error.message}`);
    }
  });
}
