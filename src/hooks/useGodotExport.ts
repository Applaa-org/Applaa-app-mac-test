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
      return await ipcClient.getGodotWebExportUrl({ appId: selectedAppId });
    },
    enabled: !!selectedAppId,
    refetchInterval: 5000, // Check every 5 seconds for new exports
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

