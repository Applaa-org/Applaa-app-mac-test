import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { useMemo } from "react";

export function useGodotProjectStatus() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // ✅ FIX: Check if this is actually a Godot app before enabling
  const { data: app } = useQuery({
    queryKey: ["app", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.getApp(selectedAppId);
    },
    enabled: !!selectedAppId,
  });

  const isGodotApp = useMemo(() => {
    if (!app) return false;
    if (app.appType === 'godot') return true;
    if (app.files && app.files.length > 0) {
      return app.files.some(file => 
        file.includes('godot-project') || 
        file.includes('project.godot') ||
        file.includes('game_spec.json')
      );
    }
    return false;
  }, [app]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["godot-project-status", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.getGodotProjectStatus({ appId: selectedAppId });
      return result;
    },
    // ✅ FIX: Only enable for Godot apps
    enabled: !!selectedAppId && isGodotApp,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.hasProject && !data?.isBuilding) {
        return false;
      }
      return 2000;
    },
    retry: 2,
  });

  return {
    hasProject: data?.hasProject ?? false,
    hasSpec: data?.hasSpec ?? false,
    isBuilding: data?.isBuilding ?? false,
    projectPath: data?.projectPath,
    specPath: data?.specPath,
    isLoading,
    error,
    refetch,
    data,
  };
}

