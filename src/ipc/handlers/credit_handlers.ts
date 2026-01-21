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
import { readSettings } from '../../main/settings';

const logger = log.scope('credit-handlers');

// Helper to get user ID from Supabase or WordPress auth
async function getUserId(): Promise<string> {
  const auth = getSupabaseAuth();
  const supabaseUser = await auth.getCurrentUser();

  if (supabaseUser) {
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

  // Try multiple lookup strategies
  if (userEmail && userEmail !== 'unknown@example.com') {
    profile = await auth.getProfileByEmailOrUsername(userEmail);
  }

  if (!profile && wordpressDisplayName) {
    profile = await auth.getProfileByEmailOrUsername(wordpressDisplayName);
  }

  if (!profile && wordpressUsername) {
    profile = await auth.getProfileByEmailOrUsername(wordpressUsername);
  }

  if (!profile) {
    throw new Error('User profile not found');
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
