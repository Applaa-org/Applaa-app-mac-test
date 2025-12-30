import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";
import type { CloneWebsiteParams, CloneWebsiteResult } from "@/ipc/ipc_types";

export function useCloneWebsite() {
  const queryClient = useQueryClient();

  const mutation = useMutation<CloneWebsiteResult, Error, CloneWebsiteParams>({
    mutationFn: async (params: CloneWebsiteParams) => {
      if (!params.url.trim()) {
        throw new Error("URL is required");
      }
      if (!params.appName.trim()) {
        throw new Error("App name is required");
      }

      // Validate URL format
      try {
        new URL(params.url);
      } catch {
        throw new Error("Invalid URL format");
      }

      const ipcClient = IpcClient.getInstance();
      return ipcClient.cloneWebsite(params);
    },
    onSuccess: () => {
      // Invalidate apps list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const cloneWebsite = async (
    params: CloneWebsiteParams,
  ): Promise<CloneWebsiteResult> => {
    return mutation.mutateAsync(params);
  };

  return {
    cloneWebsite,
    isCloning: mutation.isPending,
    error: mutation.error,
  };
}

