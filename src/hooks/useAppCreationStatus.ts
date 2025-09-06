import { useState, useEffect, useCallback } from 'react';
import { IpcClient } from '../ipc/ipc_client';
import { showSuccess, showError } from '../lib/toast';

interface AppCreationStatus {
  status: 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: any;
  appId?: number;
}

export const useAppCreationStatus = (taskId: string | null) => {
  const [status, setStatus] = useState<AppCreationStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.getAppCreationStatus(taskId);
      setStatus(result);

      // Handle completion
      if (result.status === 'completed' && isMonitoring) {
        showSuccess(`✅ App setup completed! ${result.message}`);
        setIsMonitoring(false);
        
        // Track background completion metrics
        if (typeof window !== 'undefined' && (window as any).posthog) {
          (window as any).posthog.capture("app-creation:background-completed", {
            taskId,
            appId: result.appId,
            message: result.message
          });
        }
        
        // Clean up the task after a delay
        setTimeout(async () => {
          try {
            await ipcClient.cleanupAppCreationTask(taskId);
          } catch (error) {
            console.warn('Failed to cleanup task:', error);
          }
        }, 5000);
      }

      // Handle errors
      if (result.status === 'error' && isMonitoring) {
        showError(`❌ App setup failed: ${result.error || result.message}`);
        setIsMonitoring(false);
      }

    } catch (error) {
      console.error('Failed to check app creation status:', error);
      setStatus({
        status: 'error',
        progress: 0,
        message: 'Failed to check status',
        error: error.message
      });
    }
  }, [taskId, isMonitoring]);

  // Start monitoring when taskId is provided
  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    
    // Initial check
    checkStatus();

    // Poll every 2 seconds while monitoring
    const interval = setInterval(checkStatus, 2000);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [taskId, checkStatus]);

  // Manual refresh
  const refreshStatus = useCallback(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isMonitoring,
    refreshStatus,
    isCompleted: status?.status === 'completed',
    isError: status?.status === 'error',
    isRunning: status?.status === 'running',
  };
};
