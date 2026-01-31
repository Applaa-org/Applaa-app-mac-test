/**
 * AI provider visibility and availability by subscription tier.
 * Used by ProviderSettingsGrid and ModelPicker to show/grey out providers.
 */

export type SubscriptionTier = "free" | "pro" | "ultra" | "business";

/** Cloud provider IDs that are shown in the provider grid (excluding local/custom). */
export const TIER_VISIBLE_CLOUD_IDS = [
  "google",
  "openrouter",
  "anthropic",
  "azure-openai",
  "openai",
] as const;

/** Provider IDs that are enabled (not greyed out) per tier. */
const ENABLED_BY_TIER: Record<SubscriptionTier, readonly string[]> = {
  free: ["google", "openrouter", "anthropic", "azure-openai", "openai"],
  pro: ["azure-openai", "openrouter"],
  ultra: ["anthropic", "azure-openai", "openrouter"],
  business: ["google", "openrouter", "anthropic", "azure-openai", "openai"],
};

export function getEnabledProviderIds(tier: SubscriptionTier): string[] {
  return [...ENABLED_BY_TIER[tier]];
}

export function isProviderEnabledForTier(
  providerId: string,
  tier: SubscriptionTier
): boolean {
  const enabled = ENABLED_BY_TIER[tier];
  return enabled.includes(providerId);
}

export function isProviderDisabledForTier(
  providerId: string,
  tier: SubscriptionTier
): boolean {
  if (tier === "free" || tier === "business") return false;
  return !isProviderEnabledForTier(providerId, tier);
}

/** Message shown when a provider is greyed out (e.g. "Upgrade to Pro to use this provider"). */
export function getProviderDisabledMessage(
  _providerId: string,
  tier: SubscriptionTier
): string {
  if (tier === "pro")
    return "Upgrade to Ultra to use this provider.";
  if (tier === "ultra")
    return "Contact us for more providers.";
  return "";
}

/** Whether this provider ID is subject to tier rules (one of the five main cloud providers). */
export function isTierRestrictedProvider(providerId: string): boolean {
  return TIER_VISIBLE_CLOUD_IDS.includes(providerId as (typeof TIER_VISIBLE_CLOUD_IDS)[number]);
}

/** For dropdowns: hide provider if it's tier-restricted and disabled for current tier. */
export function shouldShowProviderInPicker(providerId: string, tier: SubscriptionTier): boolean {
  if (!isTierRestrictedProvider(providerId)) return true;
  return isProviderEnabledForTier(providerId, tier);
}
