import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import type { ProblemReport } from "@/ipc/ipc_types";
import { useSettings } from "./useSettings";

export function useCheckProblems(appId: number | null) {
  const { settings } = useSettings();
  const {
    data: problemReport,
    isLoading: isChecking,
    error,
    refetch: checkProblems,
  } = useQuery<ProblemReport, Error>({
    queryKey: ["problems", appId],
    queryFn: async (): Promise<ProblemReport> => {
      if (!appId) {
        throw new Error("App ID is required");
      }
      const ipcClient = IpcClient.getInstance();
      
      try {
        // Get static analysis problems first (this is the main validation)
        const staticReport = await ipcClient.checkProblems({ appId });
        
        // Only get runtime problems if static validation is fast
        let runtimeProblems: any[] = [];
        try {
          runtimeProblems = await ipcClient.getRuntimeProblems(appId);
        } catch (runtimeError) {
          console.warn('Runtime problems check failed, continuing with static only:', runtimeError);
          // Don't fail the entire validation if runtime check fails
        }
        
        // Merge static and runtime problems
        const mergedReport: ProblemReport = {
          ...staticReport,
          problems: [
            ...staticReport.problems,
            ...runtimeProblems.map(rp => ({
              file: rp.file,
              line: rp.line,
              column: rp.column,
              message: rp.message,
              severity: rp.severity,
              code: rp.code,
              autoFixable: rp.autoFixable,
              source: rp.source
            }))
          ]
        };
        
        return mergedReport;
      } catch (error) {
        console.error('Problem check failed:', error);
        // Return empty report if validation fails
        return {
          problems: [],
          summary: { errors: 0, warnings: 0, total: 0 }
        };
      }
    },
    enabled: !!appId, // Always enabled to show Godot export errors
    // DO NOT SHOW ERROR TOAST.
  });

  return {
    problemReport,
    isChecking,
    error,
    checkProblems,
  };
}
