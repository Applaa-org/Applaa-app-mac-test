import { useMutation, useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";

export interface AutomationTaskResult {
  success: boolean;
  task: string;
  actions?: Array<{
    action: {
      type: string;
      method: string;
      params: any;
    };
    result: any;
    success: boolean;
    error?: string;
  }>;
  result?: string;
  error?: string;
}

export function useApplaaAutomation() {
  const ipcClient = IpcClient.getInstance();

  // Check automation status
  const { data: status, isLoading: isCheckingStatus } = useQuery({
    queryKey: ["applaa-automation", "status"],
    queryFn: () => ipcClient.getApplaaAutomationStatus(),
  });

  // Execute automation task
  const executeTaskMutation = useMutation({
    mutationFn: (task: string) =>
      ipcClient.executeApplaaAutomationTask({ task }),
    onError: (error: Error) => {
      showError(error);
    },
  });

  return {
    status,
    isCheckingStatus,
    executeTask: executeTaskMutation.mutateAsync,
    isExecuting: executeTaskMutation.isPending,
    taskResult: executeTaskMutation.data,
    error: executeTaskMutation.error,
  };
}

