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
    refetchInterval: 3000, // Check every 3 seconds for new exports
    retry: 2, // Retry on failure
  });

  return {
    hasExport: data?.hasExport ?? false,
    exportUrl: data?.exportUrl,
    exportPath: data?.exportPath,
    isLoading,
    error,
    refetch,
  };
}

