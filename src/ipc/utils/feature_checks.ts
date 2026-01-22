/**
 * Feature checks for premium/free tier restrictions
 * These utilities check user tier and enforce feature limits
 */

import { readSettings } from "../../main/settings";
import { db } from "@/db";
import type { UserTier } from "@/lib/schemas";
import { getSupabaseAuth } from "../../lib/supabase";
import log from "electron-log";

const logger = log.scope("feature-checks");

/**
 * Get the current user tier from Supabase profile (defaults to "free")
 * Falls back to settings if profile is not available
 */
export async function getUserTier(): Promise<UserTier> {
  console.log('🔍 [getUserTier] Starting tier lookup...');
  
  try {
    const auth = getSupabaseAuth();
    const supabaseUser = await auth.getCurrentUser();
    
    console.log('🔍 [getUserTier] Supabase user:', { 
      exists: !!supabaseUser, 
      id: supabaseUser?.id,
      email: supabaseUser?.email 
    });
    
    if (supabaseUser) {
      // Use admin client (service role) to bypass RLS and get profile by email
      // This is more reliable than getProfile(userId) which is blocked by RLS policies
      console.log('🔍 [getUserTier] Looking up profile using admin client for:', supabaseUser.email);
      const profile = await auth.getProfileByEmailOrUsername(supabaseUser.email);
      
      console.log('🔍 [getUserTier] Profile lookup result:', { 
        found: !!profile,
        profileId: profile?.id,
        email: profile?.email,
        tier: profile?.subscription_tier 
      });
      
      if (profile?.subscription_tier) {
        console.log('✅ [getUserTier] Returning tier from Supabase profile:', profile.subscription_tier);
        return profile.subscription_tier as UserTier;
      }
      
      console.log('⚠️ [getUserTier] Profile found but no subscription_tier, trying WordPress fallback...');
    }
    
    // Fallback: Try WordPress auth
    const settings = readSettings();
    const wordpressAuth = settings.wordpressAuth;
    
    console.log('🔍 [getUserTier] WordPress auth status:', {
      isAuthenticated: wordpressAuth?.isAuthenticated,
      hasUser: !!wordpressAuth?.user,
      username: wordpressAuth?.user?.username
    });
    
    if (wordpressAuth?.isAuthenticated && wordpressAuth?.user) {
      const userEmail = wordpressAuth.user.email;
      const wordpressUsername = wordpressAuth.user.username;
      const wordpressDisplayName = wordpressAuth.user.display_name;

      console.log('🔍 [getUserTier] Trying WordPress lookup strategies:', {
        email: userEmail,
        username: wordpressUsername,
        displayName: wordpressDisplayName
      });

      // Try multiple lookup strategies
      if (userEmail && userEmail !== 'unknown@example.com') {
        console.log('🔍 [getUserTier] Strategy 1: Looking up by email:', userEmail);
        const profile = await auth.getProfileByEmailOrUsername(userEmail);
        if (profile?.subscription_tier) {
          console.log('✅ [getUserTier] Found profile by email, tier:', profile.subscription_tier);
          return profile.subscription_tier as UserTier;
        }
        console.log('❌ [getUserTier] Email lookup failed or no tier');
      }

      if (wordpressDisplayName) {
        console.log('🔍 [getUserTier] Strategy 2: Looking up by display name:', wordpressDisplayName);
        const profile = await auth.getProfileByEmailOrUsername(wordpressDisplayName);
        if (profile?.subscription_tier) {
          console.log('✅ [getUserTier] Found profile by display name, tier:', profile.subscription_tier);
          return profile.subscription_tier as UserTier;
        }
        console.log('❌ [getUserTier] Display name lookup failed or no tier');
      }

      if (wordpressUsername) {
        console.log('🔍 [getUserTier] Strategy 3: Looking up by username:', wordpressUsername);
        const profile = await auth.getProfileByEmailOrUsername(wordpressUsername);
        if (profile?.subscription_tier) {
          console.log('✅ [getUserTier] Found profile by username, tier:', profile.subscription_tier);
          return profile.subscription_tier as UserTier;
        }
        console.log('❌ [getUserTier] Username lookup failed or no tier');
      }
    }
  } catch (error) {
    console.error('❌ [getUserTier] Exception during tier lookup:', error);
    logger.warn('Failed to get tier from Supabase, falling back to free:', error);
  }
  
  // Final fallback: default to free tier if database is unreachable
  // No longer using local settings - tier is always fetched from Supabase
  console.log('⚠️ [getUserTier] Database lookup failed, defaulting to free tier');
  return "free";
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
  
  // Default to free immediately, then update cache asynchronously
  // No longer using local settings - tier is always fetched from Supabase
  const fallbackTier: UserTier = "free";
  
  // Update cache asynchronously from database
  getUserTier().then(tier => {
    cachedTier = tier;
    tierCacheTime = Date.now();
  }).catch(() => {
    // If async fetch fails, cache free tier
    cachedTier = fallbackTier;
    tierCacheTime = Date.now();
  });
  
  return fallbackTier;
}

/**
 * Check if user is on Pro tier (async)
 */
export async function isProUserAsync(): Promise<boolean> {
  console.log('🔍 [isProUserAsync] Fetching user tier...');
  const tier = await getUserTier();
  const isPro = tier === "pro" || tier === "ultra" || tier === "business";
  console.log('🔍 [isProUserAsync] Result:', { tier, isPro });
  return isPro;
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
  console.log('🔍 [canCreateAppAsync] Checking if user can create app...');
  
  // Use async version to get latest tier (bypasses cache)
  const isPro = await isProUserAsync();
  console.log('🔍 [canCreateAppAsync] isProUserAsync() result:', isPro);
  
  if (isPro) {
    console.log('✅ [canCreateAppAsync] User is Pro, unlimited apps allowed');
    return { allowed: true };
  }

  const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
  const FREE_APP_LIMIT = 3;
  
  console.log('🔍 [canCreateAppAsync] Free tier check:', {
    existingApps: existingApps.count,
    limit: FREE_APP_LIMIT,
    allowed: existingApps.count < FREE_APP_LIMIT
  });
  
  if (existingApps.count >= FREE_APP_LIMIT) {
    console.log('❌ [canCreateAppAsync] App limit reached for free tier');
    return {
      allowed: false,
      reason: `FREE_TIER_APP_LIMIT:${FREE_APP_LIMIT}`,
    };
  }

  console.log('✅ [canCreateAppAsync] App creation allowed');
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
