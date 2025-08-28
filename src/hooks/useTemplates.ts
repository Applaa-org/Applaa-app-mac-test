import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { localTemplatesData, type Template } from "@/shared/templates";

export function useTemplates() {
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: async (): Promise<Template[]> => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getTemplates();
    },
    // Use latest local data as initial data but still fetch fresh data
    initialData: localTemplatesData,
    staleTime: 0, // Always consider data stale to force refresh
    meta: {
      showErrorToast: true,
    },
  });

  return {
    templates: query.data || [], // Add fallback to empty array
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
