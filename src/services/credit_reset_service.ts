import log from 'electron-log';
import { getSupabaseAdminClient } from '../lib/supabase';
import { resetMonthlyCredits } from './credit_service';

const logger = log.scope('credit-reset-service');

/**
 * Check if a user's credits need to be reset (monthly reset)
 * Returns true if credits_last_reset is more than 30 days ago
 */
export async function needsCreditReset(userId: string): Promise<boolean> {
  try {
    const adminClient = getSupabaseAdminClient();

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('credits_last_reset')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logger.error('Failed to check credit reset status:', error);
      return false;
    }

    if (!profile.credits_last_reset) {
      // No reset date means credits have never been reset
      return true;
    }

    const lastReset = new Date(profile.credits_last_reset);
    const now = new Date();
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    // Reset if it's been more than 30 days
    return daysSinceReset >= 30;
  } catch (error: any) {
    logger.error('Error checking credit reset status:', error);
    return false;
  }
}

/**
 * Check and reset credits for a user if needed
 * Call this on user login or periodically
 */
export async function checkAndResetCredits(userId: string): Promise<{ reset: boolean; newBalance?: number }> {
  try {
    const needsReset = await needsCreditReset(userId);

    if (!needsReset) {
      return { reset: false };
    }

    logger.info(`Resetting monthly credits for user: ${userId}`);
    const result = await resetMonthlyCredits(userId);

    return {
      reset: true,
      newBalance: result.newBalance,
    };
  } catch (error: any) {
    logger.error('Error checking/resetting credits:', error);
    throw error;
  }
}

/**
 * Get all users whose credits need to be reset
 * Useful for batch processing in a cron job
 */
export async function getUsersNeedingReset(): Promise<string[]> {
  try {
    const adminClient = getSupabaseAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, credits_last_reset')
      .or(`credits_last_reset.is.null,credits_last_reset.lt.${thirtyDaysAgo.toISOString()}`);

    if (error) {
      logger.error('Failed to get users needing reset:', error);
      throw new Error(`Failed to get users needing reset: ${error.message}`);
    }

    return (profiles || []).map(p => p.id);
  } catch (error: any) {
    logger.error('Error getting users needing reset:', error);
    throw error;
  }
}

/**
 * Batch reset credits for all users who need it
 * Useful for scheduled cron job
 */
export async function batchResetCredits(): Promise<{ reset: number; errors: number }> {
  try {
    const userIds = await getUsersNeedingReset();
    logger.info(`Found ${userIds.length} users needing credit reset`);

    let reset = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        await resetMonthlyCredits(userId);
        reset++;
      } catch (error: any) {
        logger.error(`Failed to reset credits for user ${userId}:`, error);
        errors++;
      }
    }

    logger.info(`Credit reset complete: ${reset} reset, ${errors} errors`);

    return { reset, errors };
  } catch (error: any) {
    logger.error('Error in batch reset credits:', error);
    throw error;
  }
}
