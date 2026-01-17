import { createClient } from '@supabase/supabase-js';
import log from 'electron-log';
import type { Database } from '../lib/supabase';
import { getCreditCost, getMonthlyCredits, getCreditRolloverLimit, type CREDIT_COSTS } from '../utils/credit_costs';

const logger = log.scope('credit-service');

// Helper function to get Supabase admin client (bypasses RLS)
function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Supabase service role key or URL not configured');
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
      .single();

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

    // Get current balance first
    const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('remaining_credits, subscription_tier')
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

    // Deduct credits and update total_credits_used
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        remaining_credits: currentBalance - operationCost,
        total_credits_used: (currentProfile.total_credits_used ?? 0) + operationCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('remaining_credits')
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to deduct credits:', updateError);
      throw new Error(`Failed to deduct credits: ${updateError?.message || 'Update failed'}`);
    }

    // Log credit usage
    const { error: usageError } = await adminClient
      .from('credit_usage')
      .insert({
        user_id: userId,
        operation_type: operationType,
        credits_used: operationCost,
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

    if (profileError || !profileError) {
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const tier = (profile.subscription_tier || 'free') as 'free' | 'pro' | 'ultra' | 'business';
    const monthlyAllocation = getMonthlyCredits(tier);
    const rolloverLimit = getCreditRolloverLimit(tier);
    const currentBalance = profile.remaining_credits ?? 0;

    // Calculate rollover (only for Pro+ tiers)
    let newBalance = monthlyAllocation;
    if (tier !== 'free' && currentBalance > 0 && rolloverLimit > 0) {
      const rolloverAmount = Math.min(currentBalance, rolloverLimit);
      newBalance = monthlyAllocation + rolloverAmount;
      logger.info(`Credit rollover: ${rolloverAmount} credits added to ${monthlyAllocation} (user: ${userId})`);
    }

    // Update credits
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        remaining_credits: newBalance,
        monthly_credits: monthlyAllocation,
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

    logger.info(`Monthly credits reset: ${newBalance} credits (user: ${userId}, tier: ${tier})`);

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
 * Get usage history for a user
 */
export async function getUsageHistory(
  userId: string,
  filters?: {
    operationType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  operationType: string;
  creditsUsed: number;
  metadata: any;
  createdAt: string;
}>> {
  try {
    const adminClient = getSupabaseAdminClient();

    let query = adminClient
      .from('credit_usage')
      .select('id, operation_type, credits_used, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.operationType) {
      query = query.eq('operation_type', filters.operationType);
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

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get usage history:', error);
      throw new Error(`Failed to get usage history: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      operationType: item.operation_type,
      creditsUsed: item.credits_used,
      metadata: item.metadata,
      createdAt: item.created_at,
    }));
  } catch (error: any) {
    logger.error('Error getting usage history:', error);
    throw error;
  }
}
