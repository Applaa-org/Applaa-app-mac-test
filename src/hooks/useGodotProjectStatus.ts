import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";

export function useGodotProjectStatus() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["godot-project-status", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.getGodotProjectStatus({ appId: selectedAppId });
      return result;
    },
    enabled: !!selectedAppId,
    // Poll every 2 seconds if project doesn't exist yet
    refetchInterval: (query) => {
      const data = query.state.data;
      // If project exists, stop polling
      if (data?.hasProject) {
        return false;
      }
      // Otherwise, check every 2 seconds
      return 2000;
    },
    retry: 2,
  });

  return {
    hasProject: data?.hasProject ?? false,
    hasSpec: data?.hasSpec ?? false,
    projectPath: data?.projectPath,
    specPath: data?.specPath,
    isLoading,
    error,
    refetch,
    data,
  };
}

