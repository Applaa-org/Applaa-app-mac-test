import { QueryClient } from "@tanstack/react-query";

/**
 * Utility functions for cache management across the app
 */

/**
 * Invalidate all settings-related caches
 * Call this when settings are updated to ensure UI consistency
 */
export function invalidateSettingsCaches(queryClient: QueryClient) {
  // Invalidate provider-related queries
  queryClient.invalidateQueries({ queryKey: ["languageModelProviders"] });
  queryClient.invalidateQueries({ queryKey: ["languageModels"] });
  queryClient.invalidateQueries({ queryKey: ["languageModelsByProviders"] });
  
  // Invalidate any provider-specific queries
  queryClient.invalidateQueries({ queryKey: ["languageModels"] });
  
  // Invalidate auth-related queries that might depend on settings
  queryClient.invalidateQueries({ queryKey: ["auth"] });
  queryClient.invalidateQueries({ queryKey: ["wordpress"] });
}

/**
 * Invalidate all app-related caches
 * Call this when apps are created, updated, or deleted
 */
export function invalidateAppCaches(queryClient: QueryClient, appId?: number) {
  if (appId) {
    queryClient.invalidateQueries({ queryKey: ["app", appId] });
    queryClient.invalidateQueries({ queryKey: ["app-files", appId] });
    queryClient.invalidateQueries({ queryKey: ["app-env-vars", appId] });
    queryClient.invalidateQueries({ queryKey: ["versions", appId] });
    queryClient.invalidateQueries({ queryKey: ["app-upgrades", appId] });
    queryClient.invalidateQueries({ queryKey: ["is-capacitor", appId] });
    queryClient.invalidateQueries({ queryKey: ["is-flutter-mobile", appId] });
  } else {
    // Invalidate all app queries
    queryClient.invalidateQueries({ queryKey: ["apps"] });
    queryClient.invalidateQueries({ queryKey: ["app"] });
  }
}

/**
 * Clear all caches - use sparingly, only when needed for debugging
 */
export function clearAllCaches(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Force refetch of all settings-related data
 */
export async function refetchSettingsData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["languageModelProviders"] }),
    queryClient.refetchQueries({ queryKey: ["languageModels"] }),
    queryClient.refetchQueries({ queryKey: ["languageModelsByProviders"] }),
  ]);
}
