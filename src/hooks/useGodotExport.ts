import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";

export function useGodotExport() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["godot-export", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.getGodotWebExportUrl({ appId: selectedAppId });
      console.log(`[useGodotExport] App ${selectedAppId}:`, result);
      return result;
    },
    enabled: !!selectedAppId,
    // Only refetch if export doesn't exist or URL is missing
    refetchInterval: (query) => {
      const data = query.state.data;
      // If export exists and URL is available, don't refetch
      if (data?.hasExport && data?.exportUrl) {
        return false; // Stop polling
      }
      // Otherwise, check every 5 seconds
      return 5000;
    },
    retry: 2, // Retry on failure
  });

  return {
    hasExport: data?.hasExport ?? false,
    exportUrl: data?.exportUrl,
    exportPath: data?.exportPath,
    isLoading,
    error: error || (data && !data.hasExport && data.error ? new Error(data.error) : null),
    errorDetails: data?.errorDetails,
    refetch,
    data, // Expose full data for error details
  };
}

