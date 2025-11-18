import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';

interface AppRepairResult {
  success: boolean;
  repaired: boolean;
  issues: string[];
  fixes: string[];
  warnings: string[];
  updatedDependencies: string[];
  installedPackages: string[];
}

interface AppRepairCheck {
  needsRepair: boolean;
  issues: string[];
  warnings: string[];
  missingDependencies: string[];
  outdatedDependencies: string[];
}

export function useAppRepair(appPath?: string) {
  const [repairResult, setRepairResult] = useState<AppRepairResult | null>(null);
  const ipcClient = IpcClient.getInstance();

  // Check if app needs repair
  const repairCheck = useQuery({
    queryKey: ['app-repair-check', appPath],
    queryFn: () => ipcClient.checkRepairNeeded(appPath!),
    enabled: !!appPath,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Repair app mutation
  const repairMutation = useMutation({
    mutationFn: (path: string) => ipcClient.repairApp(path),
    onSuccess: (result) => {
      setRepairResult(result);
      
      if (result.success) {
        console.log('✅ App repair completed successfully');
        if (result.fixes.length > 0) {
          console.log('🔧 Fixes applied:', result.fixes);
        }
      } else {
        console.error('❌ App repair failed:', result.issues);
      }
    },
    onError: (error) => {
      console.error('❌ App repair error:', error);
      setRepairResult({
        success: false,
        repaired: false,
        issues: [`Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fixes: [],
        warnings: [],
        updatedDependencies: [],
        installedPackages: []
      });
    },
  });

  // Manual repair function
  const repairApp = async (path?: string) => {
    const targetPath = path || appPath;
    if (!targetPath) {
      throw new Error('No app path provided for repair');
    }
    
    return repairMutation.mutateAsync(targetPath);
  };

  // Check repair status
  const checkRepairNeeded = async (path?: string) => {
    const targetPath = path || appPath;
    if (!targetPath) {
      throw new Error('No app path provided for repair check');
    }
    
    return ipcClient.checkRepairNeeded(targetPath);
  };

  return {
    // Data
    repairResult,
    repairCheck: repairCheck.data,
    isChecking: repairCheck.isLoading,
    checkError: repairCheck.error,
    
    // Actions
    repairApp,
    checkRepairNeeded,
    isRepairing: repairMutation.isPending,
    repairError: repairMutation.error,
    
    // Computed
    needsRepair: repairCheck.data?.needsRepair ?? false,
    hasIssues: repairCheck.data?.issues.length > 0,
    hasWarnings: repairCheck.data?.warnings.length > 0,
    missingDependencies: repairCheck.data?.missingDependencies ?? [],
    outdatedDependencies: repairCheck.data?.outdatedDependencies ?? [],
    
    // Utils
    refetchCheck: repairCheck.refetch,
    resetResult: () => setRepairResult(null),
  };
}
