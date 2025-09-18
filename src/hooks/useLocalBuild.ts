import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';
import { LocalBuildResult, LocalBuildStatus } from '@/ipc/ipc_types';

const ipcClient = IpcClient.getInstance();

export function useLocalBuildStatus() {
  return useQuery<LocalBuildStatus, Error>({
    queryKey: ['localBuildStatus'],
    queryFn: async () => {
      return await ipcClient.getLocalBuildStatus();
    },
    refetchInterval: 2000, // Poll every 2 seconds when building
    enabled: true,
  });
}

export function useLocalBuildAndroidAPK() {
  const queryClient = useQueryClient();
  
  return useMutation<LocalBuildResult, Error, { appId: number }>({
    mutationFn: async ({ appId }) => {
      return await ipcClient.buildAndroidAPK({ appId });
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate build status to refresh UI
        queryClient.invalidateQueries({ queryKey: ['localBuildStatus'] });
      }
    },
    onError: (error) => {
      console.error('Local Android APK build failed:', error);
    },
  });
}

export function useLocalBuildAndroidAAB() {
  const queryClient = useQueryClient();
  
  return useMutation<LocalBuildResult, Error, { appId: number }>({
    mutationFn: async ({ appId }) => {
      return await ipcClient.buildAndroidAAB({ appId });
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate build status to refresh UI
        queryClient.invalidateQueries({ queryKey: ['localBuildStatus'] });
      }
    },
    onError: (error) => {
      console.error('Local Android AAB build failed:', error);
    },
  });
}

export function useLocalBuildIOSIPA() {
  const queryClient = useQueryClient();
  
  return useMutation<LocalBuildResult, Error, { appId: number }>({
    mutationFn: async ({ appId }) => {
      return await ipcClient.buildIOSIPA({ appId });
    },
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate build status to refresh UI
        queryClient.invalidateQueries({ queryKey: ['localBuildStatus'] });
      }
    },
    onError: (error) => {
      console.error('Local iOS IPA build failed:', error);
    },
  });
}

export function useCancelLocalBuild() {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; error?: string }, Error, void>({
    mutationFn: async () => {
      return await ipcClient.cancelLocalBuild();
    },
    onSuccess: () => {
      // Invalidate build status to refresh UI
      queryClient.invalidateQueries({ queryKey: ['localBuildStatus'] });
    },
    onError: (error) => {
      console.error('Failed to cancel local build:', error);
    },
  });
}
