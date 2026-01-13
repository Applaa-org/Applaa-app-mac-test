/**
 * Feature checks for premium/free tier restrictions
 * These utilities check user tier and enforce feature limits
 */

import { readSettings } from "../../main/settings";
import { db } from "@/db";
import type { UserTier } from "@/lib/schemas";

/**
 * Get the current user tier (defaults to "free")
 */
export function getUserTier(): UserTier {
  const settings = readSettings();
  return settings.userTier || "free";
}

/**
 * Check if user is on Pro tier
 */
export function isProUser(): boolean {
  return getUserTier() === "pro";
}

/**
 * Check if user can create more apps
 * Free tier: max 3 apps
 * Pro tier: unlimited
 */
export function canCreateApp(): { allowed: boolean; reason?: string } {
  if (isProUser()) {
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
  if (isProUser()) {
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
  if (isProUser()) {
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
  const tier = getUserTier();
  const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };

  if (tier === "pro") {
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
