import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { toast } from "sonner";

const ipcClient = IpcClient.getInstance();

// EAS Status Hook
export function useEASStatus() {
  return useQuery({
    queryKey: ["eas", "status"],
    queryFn: () => ipcClient.getEASStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// EAS Login Hook
export function useEASLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => ipcClient.loginToEAS(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Successfully logged into EAS!");
        // Invalidate status query to refresh login state
        queryClient.invalidateQueries({ queryKey: ["eas", "status"] });
      } else {
        toast.error(`EAS login failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`EAS login error: ${error.message}`);
    },
  });
}

// EAS Build Hook
export function useEASBuild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appId, platform }: { appId: number; platform?: "all" | "ios" | "android" }) =>
      ipcClient.buildWithEAS({ appId, platform }),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`EAS build started for app ${variables.appId}!`);
        if (result.publicUrl) {
          toast.info(`Build URL: ${result.publicUrl}`);
        }
        if (result.qrCode) {
          toast.info("QR Code available for testing");
        }
      } else {
        toast.error(`EAS build failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`EAS build error: ${error.message}`);
    },
  });
}

// EAS Deploy Hook
export function useEASDeploy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appId }: { appId: number }) =>
      ipcClient.deployWithEAS({ appId }),
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`EAS deploy completed for app ${variables.appId}!`);
        if (result.publicUrl) {
          toast.info(`Deploy URL: ${result.publicUrl}`);
        }
        if (result.qrCode) {
          toast.info("QR Code available for testing");
        }
      } else {
        toast.error(`EAS deploy failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`EAS deploy error: ${error.message}`);
    },
  });
}

// EAS Build Status Hook
export function useEASBuildStatus(buildId: string | null) {
  return useQuery({
    queryKey: ["eas", "build-status", buildId],
    queryFn: () => ipcClient.getEASBuildStatus({ buildId: buildId! }),
    enabled: !!buildId,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always refetch
  });
}

// EAS Projects Hook
export function useEASProjects() {
  return useQuery({
    queryKey: ["eas", "projects"],
    queryFn: () => ipcClient.listEASProjects(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// EAS Build with Real-time Status Hook
export function useEASBuildWithStatus() {
  const queryClient = useQueryClient();
  const buildMutation = useEASBuild();
  
  return useMutation({
    mutationFn: ({ appId, platform }: { appId: number; platform?: "all" | "ios" | "android" }) =>
      ipcClient.buildWithEAS({ appId, platform }),
    onSuccess: (result, variables) => {
      if (result.success && result.buildId) {
        toast.success(`EAS build started for app ${variables.appId}!`);
        
        // Start polling for build status
        const interval = setInterval(async () => {
          try {
            const statusResult = await ipcClient.getEASBuildStatus({ buildId: result.buildId! });
            if (statusResult.success) {
              if (statusResult.status === "finished") {
                clearInterval(interval);
                toast.success("EAS build completed!");
                if (statusResult.publicUrl) {
                  toast.info(`Build URL: ${statusResult.publicUrl}`);
                }
              } else if (statusResult.status === "errored") {
                clearInterval(interval);
                toast.error("EAS build failed!");
              }
            }
          } catch (error) {
            console.error("Error checking build status:", error);
          }
        }, 10000); // Check every 10 seconds
        
        // Clear interval after 10 minutes to prevent infinite polling
        setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
      } else {
        toast.error(`EAS build failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`EAS build error: ${error.message}`);
    },
  });
}
