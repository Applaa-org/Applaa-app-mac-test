import log from 'electron-log';
import { getSupabaseAdminClient } from '../lib/supabase';
import { getCreditCost, getMonthlyCredits, getCreditRolloverLimit, type CREDIT_COSTS } from '../utils/credit_costs';

const logger = log.scope('credit-service');

export type OperationType = keyof typeof CREDIT_COSTS | 'chat_message' | 'app_creation' | 'deployment';

/**
 * Get current credit balance for a user
 */
export async function getCreditBalance(userId: string): Promise<{
  remaining: number;
  monthly: number;
  totalUsed: number;
  lastReset: string | null;
}> {
  try {
    const adminClient = getSupabaseAdminClient();
    
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('remaining_credits, monthly_credits, total_credits_used, credits_last_reset, subscription_tier')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get credit balance:', error);
      throw new Error(`Failed to get credit balance: ${error.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    const monthlyAllocation = profile.monthly_credits || getMonthlyCredits((profile.subscription_tier as any) || 'free');

    return {
      remaining: profile.remaining_credits ?? monthlyAllocation,
      monthly: monthlyAllocation,
      totalUsed: profile.total_credits_used ?? 0,
      lastReset: profile.credits_last_reset,
    };
  } catch (error: any) {
    logger.error('Error getting credit balance:', error);
    throw error;
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(
  userId: string,
  operationType: OperationType,
  cost?: number
): Promise<{ hasCredits: boolean; remaining: number; required: number }> {
  try {
    const operationCost = cost ?? getCreditCost(operationType as any);
    const balance = await getCreditBalance(userId);

    return {
      hasCredits: balance.remaining >= operationCost,
      remaining: balance.remaining,
      required: operationCost,
    };
  } catch (error: any) {
    logger.error('Error checking credits:', error);
    throw error;
  }
}

/**
 * Deduct credits from user account and log usage
 * Uses a transaction to prevent race conditions
 */
export async function deductCredits(
  userId: string,
  operationType: OperationType,
  cost?: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; remaining: number }> {
  try {
    const adminClient = getSupabaseAdminClient();
    const operationCost = cost ?? getCreditCost(operationType as any);

    // Get current balance first (remaining_credits is generated as monthly_credits - total_credits_used)
    const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('remaining_credits, total_credits_used, subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !currentProfile) {
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const currentBalance = currentProfile.remaining_credits ?? 0;

    // Check if user has enough credits
    if (currentBalance < operationCost) {
      throw new Error(
        `Insufficient credits. You need ${operationCost} credits for this operation but only have ${currentBalance} remaining.`
      );
    }

    // Deduct credits: only update total_credits_used (remaining_credits is generated)
    const newTotalCreditsUsed = (currentProfile.total_credits_used ?? 0) + operationCost;
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        total_credits_used: newTotalCreditsUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('remaining_credits')
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to deduct credits:', updateError);
      throw new Error(`Failed to deduct credits: ${updateError?.message || 'Update failed'}`);
    }

    // Extract app_id and chat_id from metadata if present
    const appId = metadata?.appId || metadata?.app_id || null;
    const chatId = metadata?.chatId || metadata?.chat_id || null;

    // Log credit usage
    const { error: usageError } = await adminClient
      .from('credit_usage')
      .insert({
        user_id: userId,
        operation_type: operationType,
        credits_used: operationCost,
        app_id: appId ? String(appId) : null,
        chat_id: chatId ? String(chatId) : null,
        metadata: metadata || {},
      });

    if (usageError) {
      logger.error('Failed to log credit usage:', usageError);
      // Don't throw - credit was already deducted, just log the error
    }

    logger.info(`Credits deducted: ${operationCost} for ${operationType} (user: ${userId}, remaining: ${updatedProfile.remaining_credits})`);

    return {
      success: true,
      remaining: updatedProfile.remaining_credits,
    };
  } catch (error: any) {
    logger.error('Error deducting credits:', error);
    throw error;
  }
}

/**
 * Reset monthly credits for a user based on their subscription tier
 * Handles credit rollover for Pro+ users
 */
export async function resetMonthlyCredits(userId: string): Promise<{ success: boolean; newBalance: number }> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Get current profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('remaining_credits, monthly_credits, subscription_tier, credits_last_reset')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const tier = (profile.subscription_tier || 'free') as 'free' | 'pro' | 'ultra' | 'business';
    const monthlyAllocation = getMonthlyCredits(tier);
    const rolloverLimit = getCreditRolloverLimit(tier);
    const currentBalance = profile.remaining_credits ?? 0;

    // Calculate rollover (only for Pro+ tiers). remaining_credits is generated as monthly_credits - total_credits_used.
    let newMonthlyCredits = monthlyAllocation;
    let newTotalCreditsUsed = 0;
    if (tier !== 'free' && currentBalance > 0 && rolloverLimit > 0) {
      const rolloverAmount = Math.min(currentBalance, rolloverLimit);
      newMonthlyCredits = monthlyAllocation + rolloverAmount;
      logger.info(`Credit rollover: ${rolloverAmount} credits added to ${monthlyAllocation} (user: ${userId})`);
    }

    // Update credits: only set writable columns (remaining_credits is generated)
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        monthly_credits: newMonthlyCredits,
        total_credits_used: newTotalCreditsUsed,
        credits_last_reset: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('remaining_credits')
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to reset monthly credits:', updateError);
      throw new Error(`Failed to reset monthly credits: ${updateError?.message || 'Update failed'}`);
    }

    logger.info(`Monthly credits reset: ${updatedProfile.remaining_credits} credits (user: ${userId}, tier: ${tier})`);

    return {
      success: true,
      newBalance: updatedProfile.remaining_credits,
    };
  } catch (error: any) {
    logger.error('Error resetting monthly credits:', error);
    throw error;
  }
}

/**
 * Update credits when subscription tier changes
 * Adds the difference between old and new tier credits to remaining_credits
 */
export async function updateCreditsOnTierChange(
  userId: string,
  newTier: 'free' | 'pro' | 'ultra' | 'business',
  oldTier?: 'free' | 'pro' | 'ultra' | 'business'
): Promise<{ success: boolean; newBalance: number; creditsAdded: number }> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Get current profile to determine old tier if not provided
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('remaining_credits, subscription_tier, monthly_credits')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const previousTier = oldTier || (profile.subscription_tier as any) || 'free';
    const currentBalance = profile.remaining_credits ?? 0;
    const oldMonthlyCredits = getMonthlyCredits(previousTier);
    const newMonthlyCredits = getMonthlyCredits(newTier);

    // Calculate credit change
    // Desired behaviour:
    // - On upgrade: keep existing balance AND add the full allocation of the new tier
    //   (e.g., had 500 remaining, upgrade adds 1000 => 1500 total)
    // - On downgrade: keep current balance, do not subtract
    let creditsToAdd = 0;
    if (newTier !== 'free' && previousTier !== newTier && newMonthlyCredits > oldMonthlyCredits) {
      creditsToAdd = newMonthlyCredits; // add full new tier allocation
      logger.info(`Upgrading from ${previousTier} (${oldMonthlyCredits}) to ${newTier} (${newMonthlyCredits}), adding full allocation ${creditsToAdd} plus current balance ${currentBalance}`);
    } else if (newTier !== previousTier) {
      logger.info(`Changing tier from ${previousTier} to ${newTier}, keeping current balance ${currentBalance}`);
    }

    const newBalance = currentBalance + creditsToAdd;
    // remaining_credits is generated as monthly_credits - total_credits_used. Set writable columns so remaining = newBalance.
    const newMonthlyValue = newBalance > newMonthlyCredits ? newBalance : newMonthlyCredits;
    const newTotalCreditsUsed = newMonthlyValue - newBalance;

    // Update credits: only set writable columns (remaining_credits is generated)
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        monthly_credits: newMonthlyValue,
        total_credits_used: newTotalCreditsUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('remaining_credits')
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to update credits on tier change:', updateError);
      throw new Error(`Failed to update credits: ${updateError?.message || 'Update failed'}`);
    }

    logger.info(`Credits updated on tier change: ${previousTier} -> ${newTier}, balance: ${currentBalance} -> ${updatedProfile.remaining_credits} (added ${creditsToAdd})`);

    return {
      success: true,
      newBalance: updatedProfile.remaining_credits,
      creditsAdded: creditsToAdd,
    };
  } catch (error: any) {
    logger.error('Error updating credits on tier change:', error);
    throw error;
  }
}

/**
 * Get usage history for a user
 */
export async function getUsageHistory(
  userId: string,
  filters?: {
    operationType?: string;
    appId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  operationType: string;
  creditsUsed: number;
  tokensUsed: number;
  appId: string | null;
  chatId: string | null;
  metadata: any;
  createdAt: string;
}>> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Try to select all columns including optional ones (tokens_used, app_id, chat_id)
    // If migration hasn't been run, these columns won't exist, so we'll catch and retry with base columns
    let query = adminClient
      .from('credit_usage')
      .select('id, operation_type, credits_used, tokens_used, app_id, chat_id, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.operationType) {
      query = query.eq('operation_type', filters.operationType);
    }

    if (filters?.appId) {
      query = query.eq('app_id', filters.appId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    let { data, error } = await query;

    // If error is about missing columns, retry with only base columns
    if (error && (error.message.includes('does not exist') || error.code === '42703')) {
      logger.warn('Some columns are missing, retrying with base columns only. Please run migrations: add_token_tracking.sql and add_app_tracking_to_credit_usage.sql');
      
      // Retry with only base columns that definitely exist
      let fallbackQuery = adminClient
        .from('credit_usage')
        .select('id, operation_type, credits_used, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.operationType) {
        fallbackQuery = fallbackQuery.eq('operation_type', filters.operationType);
      }

      if (filters?.startDate) {
        fallbackQuery = fallbackQuery.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        fallbackQuery = fallbackQuery.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        fallbackQuery = fallbackQuery.limit(filters.limit);
      }

      const fallbackResult = await fallbackQuery;
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      logger.error('Failed to get usage history:', error);
      throw new Error(`Failed to get usage history: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      operationType: item.operation_type,
      creditsUsed: item.credits_used,
      tokensUsed: (item as any).tokens_used || 0,
      appId: (item as any).app_id || null,
      chatId: (item as any).chat_id || null,
      metadata: item.metadata,
      createdAt: item.created_at,
    }));
  } catch (error: any) {
    logger.error('Error getting usage history:', error);
    throw error;
  }
}
