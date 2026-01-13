import { useSettings } from './useSettings';
import { useLoadApps } from './useLoadApps';
import { IpcClient } from '@/ipc/ipc_client';
import { useSubscriptionSync } from './useSubscriptionSync';
import { showError, showSuccess } from '@/lib/toast';

export function useApplaaPro() {
  const { settings } = useSettings();
  const { data: apps } = useLoadApps();
  const { syncSubscription } = useSubscriptionSync();
  
  // Check user tier (defaults to "free") - THIS IS THE SOURCE OF TRUTH
  const userTier = settings?.userTier || "free";
  const isPro = userTier === "pro";
  
  // Legacy support: only use if tier is not explicitly set
  // But tier should always take precedence
  const hasProKey = !!settings?.providerSettings?.auto?.apiKey?.value;
  const isProEnabled = settings?.enableApplaaPro === true;
  const isLegacyPro = isProEnabled && hasProKey;
  
  // FIXED: Tier takes absolute precedence. Only use legacy if tier is undefined/null
  const isProUser = userTier === "pro" || (userTier === undefined && isLegacyPro);
  
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
    hasProKey,
    isProEnabled,
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
