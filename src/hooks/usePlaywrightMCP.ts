import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

interface MCPServerStatus {
  running: boolean;
  port: number | null;
  uptime?: number;
}

interface MCPTestResult {
  success: boolean;
  screenshots: string[];
  errors: string[];
  performance: {
    loadTime: number;
    networkRequests: number;
  };
  accessibility: {
    violations: number;
    warnings: number;
  };
}

interface RunTestParams {
  appId: number;
  appUrl: string;
  testType?: 'smoke' | 'full' | 'accessibility';
}

export function usePlaywrightMCP() {
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();

  // Get MCP server status
  const { data: serverStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["playwright-mcp", "status"],
    queryFn: async (): Promise<MCPServerStatus> => {
      return await ipcClient.getPlaywrightMCPStatus();
    },
    refetchInterval: false, // Disable automatic polling - only check when needed
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Start MCP server
  const startServerMutation = useMutation({
    mutationFn: async (port?: number) => {
      return await ipcClient.startPlaywrightMCPServer(port);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playwright-mcp", "status"] });
    },
  });

  // Stop MCP server
  const stopServerMutation = useMutation({
    mutationFn: async () => {
      return await ipcClient.stopPlaywrightMCPServer();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playwright-mcp", "status"] });
    },
  });

  // Run app test
  const runTestMutation = useMutation({
    mutationFn: async (params: RunTestParams): Promise<MCPTestResult> => {
      return await ipcClient.runPlaywrightTest(params);
    },
  });

  return {
    // Status
    serverStatus,
    statusLoading,
    isServerRunning: serverStatus?.running ?? false,
    
    // Actions
    startServer: startServerMutation.mutateAsync,
    stopServer: stopServerMutation.mutateAsync,
    runTest: runTestMutation.mutateAsync,
    
    // Loading states
    isStarting: startServerMutation.isPending,
    isStopping: stopServerMutation.isPending,
    isRunningTest: runTestMutation.isPending,
    
    // Results
    testResult: runTestMutation.data,
    testError: runTestMutation.error,
  };
}

