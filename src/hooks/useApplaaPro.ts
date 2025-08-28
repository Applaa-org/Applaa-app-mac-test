import { useSettings } from './useSettings';
import { useLoadApps } from './useLoadApps';

export function useApplaaPro() {
  const { settings } = useSettings();
  const { data: apps } = useLoadApps();
  
  // Check if user has Applaa Pro enabled and API key configured
  const hasProKey = !!settings?.providerSettings?.auto?.apiKey?.value;
  const isProEnabled = settings?.enableApplaaPro === true;
  const isPro = isProEnabled && hasProKey;
  
  // App limits
  const FREE_APP_LIMIT = 5;
  const currentAppCount = apps?.length || 0;
  const isAtFreeLimit = currentAppCount >= FREE_APP_LIMIT;
  const canCreateMoreApps = isPro || !isAtFreeLimit;
  
  // Remaining apps for free users
  const remainingFreeApps = Math.max(0, FREE_APP_LIMIT - currentAppCount);
  
  return {
    isPro,
    hasProKey,
    isProEnabled,
    canCreateMoreApps,
    currentAppCount,
    remainingFreeApps,
    freeAppLimit: FREE_APP_LIMIT,
    isAtFreeLimit,
    upgradeUrl: '/settings/providers/auto'
  };
}
