/**
 * Feature checks for premium/free tier restrictions
 * These utilities check user tier and enforce feature limits
 */

import { readSettings } from "../../main/settings";
import { db } from "@/db";
import type { UserTier } from "@/lib/schemas";
import { getSupabaseAuth } from "../../lib/supabase";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';
import log from "electron-log";

const logger = log.scope("feature-checks");

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

/**
 * Get the current user tier from Supabase profile (defaults to "free")
 * Falls back to settings if profile is not available
 */
export async function getUserTier(): Promise<UserTier> {
  try {
    // ✅ FIX: Use admin client to bypass RLS and Supabase initialization issues
    const adminClient = getSupabaseAdminClient();
    
    // First, try to get current Supabase user session
    try {
      const auth = getSupabaseAuth();
      const supabaseUser = await auth.getCurrentUser();
      
      if (supabaseUser) {
        // Query using admin client to bypass RLS
        const { data: profile } = await adminClient
          .from('profiles')
          .select('subscription_tier')
          .eq('id', supabaseUser.id)
          .maybeSingle() as { data: { subscription_tier: string } | null };
          
        if (profile?.subscription_tier) {
          const tier = profile.subscription_tier as UserTier;
          logger.info(`✅ Got tier from Supabase user session: ${tier}`);
          return tier;
        }
      }
    } catch (error) {
      // Supabase client not initialized or session not available
      logger.debug('Supabase session check failed, trying WordPress auth:', error);
    }
    
    // Fallback: Try WordPress auth with admin client lookup
    const settings = readSettings();
    const wordpressAuth = settings.wordpressAuth;
    
    if (wordpressAuth?.isAuthenticated && wordpressAuth?.user) {
      const userEmail = wordpressAuth.user.email;
      const wordpressUsername = wordpressAuth.user.username;
      const wordpressDisplayName = wordpressAuth.user.display_name;

      // Try multiple lookup strategies using admin client
      if (userEmail && userEmail !== 'unknown@example.com') {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('subscription_tier')
          .eq('email', userEmail)
          .maybeSingle() as { data: { subscription_tier: string } | null };
          
        if (profile?.subscription_tier) {
          const tier = profile.subscription_tier as UserTier;
          logger.info(`✅ Got tier from WordPress email: ${tier}`);
          return tier;
        }
      }

      if (wordpressDisplayName) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('subscription_tier')
          .eq('wordpress_display_name', wordpressDisplayName)
          .maybeSingle() as { data: { subscription_tier: string } | null };
          
        if (profile?.subscription_tier) {
          const tier = profile.subscription_tier as UserTier;
          logger.info(`✅ Got tier from WordPress display name: ${tier}`);
          return tier;
        }
      }

      if (wordpressUsername) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('subscription_tier')
          .eq('wordpress_username', wordpressUsername)
          .maybeSingle() as { data: { subscription_tier: string } | null };
          
        if (profile?.subscription_tier) {
          const tier = profile.subscription_tier as UserTier;
          logger.info(`✅ Got tier from WordPress username: ${tier}`);
          return tier;
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to get tier from Supabase, falling back to settings:', error);
  }
  
  // Final fallback: use settings (for backwards compatibility)
  const settings = readSettings();
  const tier: UserTier = (settings.userTier as UserTier) || "free";
  logger.info(`⚠️ Using fallback tier from settings: ${tier}`);
  return tier;
}

/**
 * Synchronous version that caches the tier
 * Note: This may return stale data. Use async version when possible.
 */
let cachedTier: UserTier | null = null;
let tierCacheTime: number = 0;
const TIER_CACHE_TTL = 60000; // 1 minute cache

export function getUserTierSync(): UserTier {
  const now = Date.now();
  
  // Return cached tier if still valid
  if (cachedTier && (now - tierCacheTime) < TIER_CACHE_TTL) {
    return cachedTier;
  }
  
  // Fallback to settings immediately, then update cache asynchronously
  const settings = readSettings();
  const fallbackTier: UserTier = (settings.userTier as UserTier) || "free";
  
  // Update cache asynchronously
  getUserTier().then(tier => {
    cachedTier = tier;
    tierCacheTime = Date.now();
  }).catch(() => {
    // If async fetch fails, keep using fallback
    cachedTier = fallbackTier;
    tierCacheTime = Date.now();
  });
  
  return fallbackTier;
}

/**
 * Check if user is on Pro tier (async)
 */
export async function isProUserAsync(): Promise<boolean> {
  const tier = await getUserTier();
  return tier === "pro" || tier === "ultra" || tier === "business";
}

/**
 * Check if user is on Pro tier (sync, uses cache)
 */
export function isProUser(): boolean {
  const tier = getUserTierSync();
  return tier === "pro" || tier === "ultra" || tier === "business";
}

/**
 * Check if user can create more apps (sync version - uses cache)
 * Free tier: max 3 apps
 * Pro tier: unlimited
 */
export function canCreateApp(): { allowed: boolean; reason?: string } {
  // Use sync version for immediate check
  const isPro = isProUser();
  if (isPro) {
    return { allowed: true };
  }

  const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
  const FREE_APP_LIMIT = 3;
  
  if (existingApps.count >= FREE_APP_LIMIT) {
    return {
      allowed: false,
      reason: `FREE_TIER_APP_LIMIT:${FREE_APP_LIMIT}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create more apps (async version - always fetches latest tier)
 * Free tier: max 3 apps
 * Pro tier: unlimited
 */
export async function canCreateAppAsync(): Promise<{ allowed: boolean; reason?: string }> {
  // Use async version to get latest tier (bypasses cache)
  const isPro = await isProUserAsync();
  if (isPro) {
    return { allowed: true };
  }

  const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
  const FREE_APP_LIMIT = 3;
  
  if (existingApps.count >= FREE_APP_LIMIT) {
    return {
      allowed: false,
      reason: `FREE_TIER_APP_LIMIT:${FREE_APP_LIMIT}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can deploy apps
 * Free tier: no deployments
 * Pro tier: allowed
 */
export function canDeployApp(): { allowed: boolean; reason?: string } {
  // Use sync version for immediate check
  const isPro = isProUser();
  if (isPro) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "FREE_TIER_NO_DEPLOYMENT",
  };
}

/**
 * Check if user can use premium AI models
 * Free tier: no premium models
 * Pro tier: allowed
 */
export function canUsePremiumModel(modelName: string, provider: string): { allowed: boolean; reason?: string } {
  // Use sync version for immediate check
  const isPro = isProUser();
  if (isPro) {
    return { allowed: true };
  }

  // Define premium models (these are typically the more expensive/powerful models)
  const PREMIUM_MODELS: Record<string, string[]> = {
    openai: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4.1", "gpt-5"],
    anthropic: ["claude-3-opus", "claude-3-5-sonnet", "claude-sonnet-4"],
    google: ["gemini-2.0-flash-exp", "gemini-pro", "gemini-ultra"],
    "azure-openai": ["gpt-4", "gpt-4o", "gpt-4.1", "gpt-5"],
  };

  const premiumModelsForProvider = PREMIUM_MODELS[provider] || [];
  const isPremiumModel = premiumModelsForProvider.some(
    (premiumModel) => modelName.toLowerCase().includes(premiumModel.toLowerCase())
  );

  if (isPremiumModel) {
    return {
      allowed: false,
      reason: "FREE_TIER_NO_PREMIUM_MODELS",
    };
  }

  return { allowed: true };
}

/**
 * Get feature limits for the current user tier
 */
export function getFeatureLimits() {
  const tier = getUserTierSync();
  const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };

  if (tier === "pro" || tier === "ultra" || tier === "business") {
    return {
      tier: "pro" as const,
      maxApps: Infinity,
      canDeploy: true,
      canUsePremiumModels: true,
      currentAppCount: existingApps.count,
    };
  }

  return {
    tier: "free" as const,
    maxApps: 3,
    canDeploy: false,
    canUsePremiumModels: false,
    currentAppCount: existingApps.count,
    remainingApps: Math.max(0, 3 - existingApps.count),
  };
}
