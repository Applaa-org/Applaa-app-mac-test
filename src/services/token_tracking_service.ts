import { createClient } from '@supabase/supabase-js';
import log from 'electron-log';
import type { Database } from '../lib/supabase';

const logger = log.scope('token-tracking-service');

// Helper function to get Supabase admin client (bypasses RLS)
function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODUxOSwiZXhwIjoyMDcyNjY0NTE5fQ.0SfO6KTBztQUMZuZVQkCATZd0B8w2nnAUQcG4c1hMIs";
  const supabaseUrl = process.env.SUPABASE_URL || "https://pzprgvlutyfqfwmllufm.supabase.co";

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

/**
 * Track token usage for a user
 * Updates both total_tokens_used in profiles and records in credit_usage table
 */
export async function trackTokenUsage(
  userId: string,
  tokensUsed: number,
  operationType: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; newTotal: number }> {
  try {
    const adminClient = getSupabaseAdminClient();

    // Get current total
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('total_tokens_used')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logger.error('Failed to get profile for token tracking:', profileError);
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const currentTotal = profile.total_tokens_used || 0;
    const newTotal = currentTotal + tokensUsed;

    // Update total_tokens_used in profiles
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        total_tokens_used: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('total_tokens_used')
      .single();

    if (updateError || !updatedProfile) {
      logger.error('Failed to update token usage in profile:', updateError);
      throw new Error(`Failed to update token usage: ${updateError?.message || 'Update failed'}`);
    }

    // Extract app_id and chat_id from metadata if present
    const appId = metadata?.appId || metadata?.app_id || null;
    const chatId = metadata?.chatId || metadata?.chat_id || null;

    // Also update credit_usage table with tokens_used if the record exists
    // Note: We'll update the most recent credit_usage record for this operation
    // This assumes credits were deducted right before tokens were used
    try {
      const { data: recentUsage, error: usageError } = await adminClient
        .from('credit_usage')
        .select('id')
        .eq('user_id', userId)
        .eq('operation_type', operationType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!usageError && recentUsage) {
        // Update the most recent credit_usage record with tokens
        await adminClient
          .from('credit_usage')
          .update({
            tokens_used: tokensUsed,
            app_id: appId ? String(appId) : null,
            chat_id: chatId ? String(chatId) : null,
            metadata: {
              ...metadata,
              tokens_used: tokensUsed,
              previous_total: currentTotal,
              new_total: newTotal,
            },
          })
          .eq('id', recentUsage.id);
      } else {
        // If no credit_usage record exists, create one for token tracking
        await adminClient
          .from('credit_usage')
          .insert({
            user_id: userId,
            operation_type: operationType,
            credits_used: 0, // No credits deducted, just tracking tokens
            tokens_used: tokensUsed,
            app_id: appId ? String(appId) : null,
            chat_id: chatId ? String(chatId) : null,
            metadata: {
              ...metadata,
              tokens_used: tokensUsed,
              previous_total: currentTotal,
              new_total: newTotal,
            },
          });
      }
    } catch (creditUsageError: any) {
      // Log but don't throw - token tracking in profile is more important
      logger.warn('Failed to update credit_usage with tokens:', creditUsageError);
    }

    logger.info(`Token usage tracked: ${tokensUsed} tokens for ${operationType} (user: ${userId}, total: ${newTotal})`);

    return {
      success: true,
      newTotal: updatedProfile.total_tokens_used || newTotal,
    };
  } catch (error: any) {
    logger.error('Error tracking token usage:', error);
    throw error;
  }
}

/**
 * Get total token usage for a user
 */
export async function getTotalTokenUsage(userId: string): Promise<number> {
  try {
    const adminClient = getSupabaseAdminClient();

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('total_tokens_used')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logger.error('Failed to get token usage:', error);
      throw new Error(`Failed to get token usage: ${error?.message || 'Profile not found'}`);
    }

    return profile.total_tokens_used || 0;
  } catch (error: any) {
    logger.error('Error getting token usage:', error);
    throw error;
  }
}

export interface TokenUsageByApp {
  appId: string | null;
  tokens: number;
  appName?: string;
}

/**
 * Get token usage summary for a user: total tokens and per-app breakdown.
 * totalTokens comes from profiles.total_tokens_used; byApp is aggregated from credit_usage.
 */
export async function getTokenUsageSummary(userId: string): Promise<{
  totalTokens: number;
  byApp: TokenUsageByApp[];
}> {
  try {
    const adminClient = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('total_tokens_used')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logger.error('Failed to get profile for token summary:', profileError);
      throw new Error(`Failed to get user profile: ${profileError?.message || 'Profile not found'}`);
    }

    const totalTokens = profile.total_tokens_used || 0;

    // Aggregate from credit_usage: rows with tokens_used set, grouped by app_id
    const { data: usageRows, error: usageError } = await adminClient
      .from('credit_usage')
      .select('app_id, tokens_used, metadata')
      .eq('user_id', userId)
      .gt('tokens_used', 0);

    if (usageError) {
      logger.warn('Failed to get credit_usage for by-app aggregation:', usageError);
      return { totalTokens, byApp: [] };
    }

    const tokensByApp = new Map<string | null, number>();
    const appNames = new Map<string | null, string>();

    for (const row of usageRows || []) {
      const tokens = (row as { tokens_used?: number }).tokens_used ?? 0;
      if (tokens <= 0) continue;
      const appId = (row as { app_id?: string | null }).app_id ?? null;
      const current = tokensByApp.get(appId) ?? 0;
      tokensByApp.set(appId, current + tokens);
      const meta = (row as { metadata?: { appName?: string } }).metadata;
      if (appId && meta?.appName && !appNames.has(appId)) {
        appNames.set(appId, meta.appName);
      }
    }

    const byApp: TokenUsageByApp[] = Array.from(tokensByApp.entries())
      .map(([appId, tokens]) => ({
        appId,
        tokens,
        appName: appId ? appNames.get(appId) : undefined,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    return { totalTokens, byApp };
  } catch (error: any) {
    logger.error('Error getting token usage summary:', error);
    throw error;
  }
}
