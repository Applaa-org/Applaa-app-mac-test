import { useSettings } from './useSettings';
import { useLoadApps } from './useLoadApps';
import { useProfile } from './useProfile';
import { IpcClient } from '@/ipc/ipc_client';
import { useSubscriptionSync } from './useSubscriptionSync';
import { showError, showSuccess } from '@/lib/toast';

export function useApplaaPro() {
  const { settings } = useSettings();
  const { data: apps } = useLoadApps();
  const { profile } = useProfile();
  const { syncSubscription } = useSubscriptionSync();
  
  // Check user tier from Supabase profile (defaults to "free") - THIS IS THE SOURCE OF TRUTH
  const userTier = (profile?.subscription_tier || settings?.userTier || "free") as 'free' | 'pro' | 'ultra' | 'business';
  const isPro = userTier === "pro" || userTier === "ultra" || userTier === "business";
  
  // ✅ SIMPLIFIED: Pro tier is now ONLY subscription-based
  // Removed legacy gateway API key checks (hasProKey, isProEnabled)
  const isProUser = isPro;
  
  // App limits - Free tier: max 3 apps, Pro: unlimited
  const FREE_APP_LIMIT = 3;
  const currentAppCount = apps?.length || 0;
  const isAtFreeLimit = !isProUser && currentAppCount >= FREE_APP_LIMIT;
  const canCreateMoreApps = isProUser || !isAtFreeLimit;
  
  // Remaining apps for free users
  const remainingFreeApps = isProUser ? Infinity : Math.max(0, FREE_APP_LIMIT - currentAppCount);
  
  // Helper function to redirect to subscribe page
  const redirectToSubscribe = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.redirectToSubscribe();
      showSuccess("Opening subscription page in your browser...");
    } catch (error: any) {
      showError(error.message || "Failed to open subscription page");
      throw error;
    }
  };
  
  // Helper function to sync subscription
  const syncSubscriptionStatus = async () => {
    try {
      await syncSubscription();
    } catch (error) {
      // Error is already handled in the hook
      throw error;
    }
  };
  
  return {
    isPro: isProUser,
    userTier,
    hasProKey: isPro, // ✅ DEPRECATED: Kept for backwards compatibility, but now just mirrors isPro
    isProEnabled: isPro, // ✅ DEPRECATED: Kept for backwards compatibility, but now just mirrors isPro
    canCreateMoreApps,
    currentAppCount,
    remainingFreeApps,
    freeAppLimit: FREE_APP_LIMIT,
    isAtFreeLimit,
    upgradeUrl: '/settings',
    canDeploy: isProUser,
    canUsePremiumModels: isProUser,
    redirectToSubscribe,
    syncSubscriptionStatus,
  };
}
