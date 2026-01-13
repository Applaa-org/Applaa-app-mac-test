import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess, showError } from "@/lib/toast";
import { invalidateSettingsCaches } from "@/lib/cache-utils";

export function useSubscriptionSync() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.syncSubscriptionFromSupabase();
    },
    onSuccess: (data) => {
      // Invalidate settings cache to refresh tier
      invalidateSettingsCaches(queryClient);
      
      // Reload settings to get updated tier
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      
      const tierText = data.tier === "pro" ? "Pro" : "Free";
      showSuccess(`Subscription synced successfully. Your tier is now: ${tierText}`);
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to sync subscription");
    },
  });

  return {
    syncSubscription: () => syncMutation.mutateAsync(),
    isSyncing: syncMutation.isPending,
    error: syncMutation.error,
  };
}
