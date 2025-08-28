/**
 * Flutter Environment React Hook
 * 
 * Provides React hooks for Flutter SDK detection, validation, and environment management.
 * Integrates with the Flutter IPC handlers for comprehensive environment support.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';
import type { 
  FlutterDoctorResult, 
  Result, 
  MobileError 
} from '@/lib/mobile/types';

/**
 * Flutter environment status
 */
export interface FlutterEnvironmentStatus {
  /** Whether Flutter SDK is installed and working */
  isReady: boolean;
  
  /** Whether we're currently checking the environment */
  isChecking: boolean;
  
  /** Flutter Doctor results */
  doctorResult?: FlutterDoctorResult;
  
  /** List of issues preventing Flutter usage */
  issues: string[];
  
  /** List of recommendations for improvement */
  recommendations: string[];
  
  /** Whether environment check has been performed */
  hasChecked: boolean;
  
  /** Last check timestamp */
  lastChecked?: Date;
}

/**
 * Hook for Flutter environment management
 */
export function useFlutterEnvironment() {
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();

  // Query for Flutter Doctor results
  const {
    data: doctorResult,
    isLoading: isDoctorLoading,
    error: doctorError,
    refetch: refetchDoctor
  } = useQuery({
    queryKey: ['flutter', 'doctor'],
    queryFn: async () => {
      console.log('[Flutter] Running doctor check...');
      const result = await ipcClient.flutterDoctor();
      console.log('[Flutter] Doctor check completed:', result.sdkInstalled);
      return result;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      showErrorToast: false // We'll handle errors gracefully
    }
  });

  // Query for environment validation
  const {
    data: validationResult,
    isLoading: isValidationLoading,
    error: validationError,
    refetch: refetchValidation
  } = useQuery({
    queryKey: ['flutter', 'validate-environment'],
    queryFn: async () => {
      console.log('[Flutter] Validating environment...');
      const result = await ipcClient.validateFlutterEnvironment();
      console.log('[Flutter] Environment validation:', result.success ? 'ready' : 'issues found');
      return result;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    meta: {
      showErrorToast: false
    }
  });

  // Mutation for refreshing environment
  const refreshEnvironmentMutation = useMutation({
    mutationFn: async () => {
      console.log('[Flutter] Refreshing environment...');
      
      // Invalidate and refetch both queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flutter', 'doctor'] }),
        queryClient.invalidateQueries({ queryKey: ['flutter', 'validate-environment'] })
      ]);
      
      // Wait for fresh data
      await Promise.all([
        refetchDoctor(),
        refetchValidation()
      ]);
    },
    onSuccess: () => {
      console.log('[Flutter] Environment refresh completed');
    },
    onError: (error) => {
      console.error('[Flutter] Environment refresh failed:', error);
    }
  });

  // Compute environment status
  const environmentStatus = useMemo((): FlutterEnvironmentStatus => {
    const isChecking = isDoctorLoading || isValidationLoading || refreshEnvironmentMutation.isPending;
    const hasChecked = doctorResult !== undefined || validationResult !== undefined;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze doctor results
    if (doctorResult) {
      if (!doctorResult.sdkInstalled) {
        issues.push('Flutter SDK is not installed');
      }
      
      if (!doctorResult.androidToolchain.installed) {
        issues.push('Android development environment not configured');
      }
      
      // iOS toolchain check will be handled by the main process
      // We can't access process.platform in the browser environment
      if (!doctorResult.iosToolchain.installed) {
        issues.push('iOS development environment not configured (macOS only)');
      }
      
      // Add doctor-specific issues
      issues.push(...doctorResult.issues.filter(issue => issue.type === 'error').map(issue => issue.message));
      recommendations.push(...doctorResult.issues.filter(issue => issue.type === 'warning').map(issue => issue.suggestion || issue.message));
    }
    
    // Analyze validation results
    if (validationResult?.success && validationResult.data) {
      issues.push(...validationResult.data.issues);
      recommendations.push(...validationResult.data.recommendations);
    }
    
    const isReady = issues.length === 0 && doctorResult?.sdkInstalled === true;
    
    return {
      isReady,
      isChecking,
      doctorResult,
      issues: [...new Set(issues)], // Remove duplicates
      recommendations: [...new Set(recommendations)],
      hasChecked,
      lastChecked: hasChecked ? new Date() : undefined
    };
  }, [
    doctorResult, 
    validationResult, 
    isDoctorLoading, 
    isValidationLoading, 
    refreshEnvironmentMutation.isPending
  ]);

  // Refresh function
  const refreshEnvironment = useCallback(() => {
    refreshEnvironmentMutation.mutate();
  }, [refreshEnvironmentMutation]);

  // Auto-refresh on mount
  useEffect(() => {
    if (!environmentStatus.hasChecked) {
      console.log('[Flutter] Auto-checking environment on mount');
    }
  }, [environmentStatus.hasChecked]);

  return {
    environmentStatus,
    refreshEnvironment,
    isRefreshing: refreshEnvironmentMutation.isPending,
    refreshError: refreshEnvironmentMutation.error
  };
}

/**
 * Hook for Flutter SDK quick check
 */
export function useFlutterSDK() {
  const ipcClient = IpcClient.getInstance();

  return useQuery({
    queryKey: ['flutter', 'sdk-check'],
    queryFn: async () => {
      const result = await ipcClient.checkFlutterSDK();
      return result;
    },
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    meta: {
      showErrorToast: false
    }
  });
}

/**
 * Hook for Flutter version information
 */
export function useFlutterVersion() {
  const ipcClient = IpcClient.getInstance();

  return useQuery({
    queryKey: ['flutter', 'version'],
    queryFn: async () => {
      const result = await ipcClient.getFlutterVersion();
      return result;
    },
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      showErrorToast: false
    }
  });
}

/**
 * Hook for Flutter installation guidance
 */
export function useFlutterInstallation() {
  const ipcClient = IpcClient.getInstance();

  const {
    data: installationGuide,
    isLoading,
    error
  } = useQuery({
    queryKey: ['flutter', 'installation-guide'],
    queryFn: async () => {
      const result = await ipcClient.installFlutterSDK();
      return result;
    },
    retry: false,
    staleTime: 60 * 60 * 1000, // 1 hour
    meta: {
      showErrorToast: false
    }
  });

  return {
    installationGuide: installationGuide?.success ? installationGuide.data : null,
    isLoading,
    error
  };
}

/**
 * Hook for Flutter project creation
 */
export function useFlutterProjectCreation() {
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();

  return useMutation({
    mutationFn: async (options: Parameters<typeof ipcClient.createFlutterProject>[0]) => {
      console.log('[Flutter] Creating project:', options.displayName);
      const result = await ipcClient.createFlutterProject(options);
      
      if (!result.success) {
        throw new Error(result.error.reason || 'Project creation failed');
      }
      
      return result.data;
    },
    onSuccess: (project) => {
      console.log('[Flutter] Project created successfully:', project.path);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['apps'] });
    },
    onError: (error) => {
      console.error('[Flutter] Project creation failed:', error);
    }
  });
}

/**
 * Hook for Flutter project validation
 */
export function useFlutterProjectValidation() {
  const ipcClient = IpcClient.getInstance();

  return useMutation({
    mutationFn: async (projectPath: string) => {
      const result = await ipcClient.validateFlutterProject(projectPath);
      
      if (!result.success) {
        throw new Error('Project validation failed');
      }
      
      return result.data;
    }
  });
}

/**
 * Hook for checking if Flutter is in PATH
 */
export function useFlutterPath() {
  const ipcClient = IpcClient.getInstance();

  return useQuery({
    queryKey: ['flutter', 'path-check'],
    queryFn: async () => {
      const [inPath, pathResult] = await Promise.all([
        ipcClient.isFlutterInPath(),
        ipcClient.getFlutterPath()
      ]);
      
      return {
        inPath,
        path: pathResult.success ? pathResult.data : null,
        error: pathResult.success ? null : pathResult.error
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    meta: {
      showErrorToast: false
    }
  });
}

/**
 * Hook for Flutter environment health monitoring
 */
export function useFlutterHealthCheck() {
  const { environmentStatus, refreshEnvironment } = useFlutterEnvironment();

  // Auto-refresh if environment is not ready and it's been a while
  useEffect(() => {
    if (!environmentStatus.isReady && 
        environmentStatus.hasChecked && 
        environmentStatus.lastChecked) {
      
      const timeSinceLastCheck = Date.now() - environmentStatus.lastChecked.getTime();
      const shouldRefresh = timeSinceLastCheck > 5 * 60 * 1000; // 5 minutes
      
      if (shouldRefresh) {
        console.log('[Flutter] Auto-refreshing stale environment check');
        refreshEnvironment();
      }
    }
  }, [environmentStatus, refreshEnvironment]);

  return {
    isHealthy: environmentStatus.isReady,
    issues: environmentStatus.issues,
    recommendations: environmentStatus.recommendations,
    lastChecked: environmentStatus.lastChecked,
    refreshHealth: refreshEnvironment
  };
}

