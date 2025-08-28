import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { toast } from 'sonner';

export interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  skipped: number;
  errors: string[];
  message?: string;
}

export interface AppSyncStatus {
  fileCount: number;
  totalSize: number;
  lastSync: Date | null;
  hasRemoteFiles: boolean;
}

export function useR2Storage() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize R2 from settings
  const initializeR2 = useCallback(async () => {
    try {
      const result = await IpcClient.getInstance().r2InitializeFromSettings();
      if (result.success) {
        setIsInitialized(true);
        return true;
      } else {
        console.warn('R2 not configured:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize R2:', error);
      return false;
    }
  }, []);

  // Test R2 connection
  const { data: connectionStatus, refetch: testConnection } = useQuery({
    queryKey: ['r2', 'connection'],
    queryFn: async () => {
      const initialized = await initializeR2();
      if (!initialized) {
        return { success: false, error: 'Not configured' };
      }

      const result = await IpcClient.getInstance().r2TestConnection();
      return result;
    },
    enabled: false, // Only run when explicitly called
  });

  // Save R2 credentials
  const saveCredentialsMutation = useMutation({
    mutationFn: async (credentials: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucketName: string;
      region?: string;
    }) => {
      const result = await IpcClient.getInstance().r2SaveCredentials(credentials);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save credentials');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'R2 credentials saved successfully');
      setIsInitialized(false); // Reset to trigger re-initialization
      queryClient.invalidateQueries({ queryKey: ['r2'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Upload file
  const uploadFileMutation = useMutation({
    mutationFn: async (params: { localPath: string; r2Key: string }) => {
      const result = await IpcClient.getInstance().r2UploadFile(params);
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'File uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['r2'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Download file
  const downloadFileMutation = useMutation({
    mutationFn: async (params: { r2Key: string; localPath: string }) => {
      const result = await IpcClient.getInstance().r2DownloadFile(params);
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'File downloaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete file
  const deleteFileMutation = useMutation({
    mutationFn: async (params: { r2Key: string }) => {
      const result = await IpcClient.getInstance().r2DeleteFile(params);
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'File deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['r2'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sync app to R2
  const syncAppMutation = useMutation({
    mutationFn: async (options: {
      appId: number;
      includePatterns?: string[];
      excludePatterns?: string[];
      dryRun?: boolean;
    }) => {
      const result = await IpcClient.getInstance().r2SyncApp(options);
      if (!result.success) {
        throw new Error(result.message || 'Sync failed');
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toast.warning(`Sync completed with ${data.errors.length} errors. Check logs for details.`);
      } else {
        toast.success(data.message || 'App synced successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['r2'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Restore app from R2
  const restoreAppMutation = useMutation({
    mutationFn: async (params: { appId: number; targetPath: string }) => {
      const result = await IpcClient.getInstance().r2RestoreApp(params);
      if (!result.success) {
        throw new Error(result.message || 'Restore failed');
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toast.warning(`Restore completed with ${data.errors.length} errors. Check logs for details.`);
      } else {
        toast.success(data.message || 'App restored successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // State
    isInitialized,
    connectionStatus,

    // Actions
    initializeR2,
    testConnection,
    saveCredentials: saveCredentialsMutation.mutateAsync,
    uploadFile: uploadFileMutation.mutateAsync,
    downloadFile: downloadFileMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    syncApp: syncAppMutation.mutateAsync,
    restoreApp: restoreAppMutation.mutateAsync,

    // Mutation states
    isSavingCredentials: saveCredentialsMutation.isPending,
    isUploadingFile: uploadFileMutation.isPending,
    isDownloadingFile: downloadFileMutation.isPending,
    isDeletingFile: deleteFileMutation.isPending,
    isSyncingApp: syncAppMutation.isPending,
    isRestoringApp: restoreAppMutation.isPending,
  };
}

// Hook for app-specific R2 operations
export function useAppR2Storage(appId: number | null) {
  const queryClient = useQueryClient();
  const { initializeR2 } = useR2Storage();

  // Get app sync status
  const { data: syncStatus, isLoading: isLoadingSyncStatus, refetch: refetchSyncStatus } = useQuery({
    queryKey: ['r2', 'app-sync-status', appId],
    queryFn: async () => {
      if (!appId) return null;

      const initialized = await initializeR2();
      if (!initialized) return null;

      const result = await IpcClient.getInstance().r2GetAppSyncStatus({ appId });
      return result.success ? result.status : null;
    },
    enabled: !!appId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // List app files in R2
  const { data: appFiles, isLoading: isLoadingFiles, refetch: refetchFiles } = useQuery({
    queryKey: ['r2', 'app-files', appId],
    queryFn: async () => {
      if (!appId) return [];

      const initialized = await initializeR2();
      if (!initialized) return [];

      // Get app data first to construct the prefix
      const result = await IpcClient.getInstance().r2ListFiles({
        prefix: `apps/${appId}/`,
        maxKeys: 1000,
      });

      return result.success ? result.files || [] : [];
    },
    enabled: !!appId,
  });

  return {
    // Data
    syncStatus,
    appFiles,
    
    // Loading states
    isLoadingSyncStatus,
    isLoadingFiles,
    
    // Actions
    refetchSyncStatus,
    refetchFiles,
    
    // Computed properties
    hasRemoteFiles: syncStatus?.hasRemoteFiles || false,
    fileCount: syncStatus?.fileCount || 0,
    totalSize: syncStatus?.totalSize || 0,
    lastSync: syncStatus?.lastSync || null,
  };
}

// Hook for file operations
export function useR2FileOperations() {
  const queryClient = useQueryClient();

  // List files with prefix
  const listFilesMutation = useMutation({
    mutationFn: async (params: { prefix?: string; maxKeys?: number }) => {
      const result = await IpcClient.getInstance().r2ListFiles(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to list files');
      }
      return result.files || [];
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Check if file exists
  const fileExistsMutation = useMutation({
    mutationFn: async (params: { r2Key: string }) => {
      const result = await IpcClient.getInstance().r2FileExists(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to check file existence');
      }
      return result.exists || false;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Actions
    listFiles: listFilesMutation.mutateAsync,
    checkFileExists: fileExistsMutation.mutateAsync,

    // States
    isListingFiles: listFilesMutation.isPending,
    isCheckingFileExists: fileExistsMutation.isPending,
  };
}

// Utility function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to get relative time
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

