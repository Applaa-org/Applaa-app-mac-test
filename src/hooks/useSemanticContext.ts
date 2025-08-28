import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { showError, showSuccess } from '../lib/toast';

export interface SmartSuggestion {
  filePath: string;
  similarity: number;
  relevanceScore: number;
  summary: string;
  language: string;
  tokens: number;
  reason: string;
}

export interface SemanticSuggestionsParams {
  query: string;
  appId: number;
  maxSuggestions?: number;
  minSimilarity?: number;
  excludePaths?: string[];
  includeOtherApps?: boolean;
  mentionedApps?: string[];
}

export function useSemanticSuggestions(params: SemanticSuggestionsParams, enabled = true) {
  return useQuery({
    queryKey: ['semantic-suggestions', params],
    queryFn: async (): Promise<SmartSuggestion[]> => {
      try {
        const ipcClient = IpcClient.getInstance();
        return await ipcClient.getSemanticSuggestions(params);
      } catch (error) {
        console.warn('Semantic suggestions not available:', error);
        return []; // Return empty array on error
      }
    },
    enabled: enabled && !!params.query && !!params.appId,
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on failure
    meta: {
      showErrorToast: false // Handle errors gracefully
    }
  });
}

export function useIndexApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appId: number;
      appPath: string;
      excludePaths?: string[];
      includePatterns?: string[];
    }) => {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.indexApp(params);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to index app');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['semantic-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['app-indexed', variables.appId] });
      queryClient.invalidateQueries({ queryKey: ['semantic-file-count', variables.appId] });
      
      showSuccess('App indexed successfully for semantic search');
    },
    onError: (error: Error) => {
      showError(`Failed to index app: ${error.message}`);
    }
  });
}

export function useRecordSemanticFeedback() {
  return useMutation({
    mutationFn: async (params: {
      filePath: string;
      appId: number;
      query: string;
      accepted: boolean;
    }) => {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.recordSemanticFeedback(params);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record feedback');
      }
      
      return result;
    },
    onError: (error: Error) => {
      console.warn('Failed to record semantic feedback:', error.message);
      // Don't show error toast for feedback - it's not critical
    }
  });
}

export function useIsAppIndexed(appId: number) {
  return useQuery({
    queryKey: ['app-indexed', appId],
    queryFn: async (): Promise<boolean> => {
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.isAppIndexed({ appId });
    },
    enabled: !!appId,
    staleTime: 60000, // 1 minute
    meta: {
      showErrorToast: false
    }
  });
}

export function useSemanticFileCount(appId: number) {
  return useQuery({
    queryKey: ['semantic-file-count', appId],
    queryFn: async (): Promise<number> => {
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.getSemanticFileCount({ appId });
    },
    enabled: !!appId,
    staleTime: 60000, // 1 minute
    meta: {
      showErrorToast: false
    }
  });
}

export function useSemanticAnalytics(appId?: number) {
  return useQuery({
    queryKey: ['semantic-analytics', appId],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.getSemanticAnalytics({ appId });
    },
    staleTime: 300000, // 5 minutes
    meta: {
      showErrorToast: false
    }
  });
}

export function useInitializeSemanticContext() {
  return useMutation({
    mutationFn: async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const result = await ipcClient.initializeSemanticContext();
        
        if (!result.success) {
          console.warn('Semantic context initialization failed:', result.error);
          return { success: false, error: result.error };
        }
        
        return result;
      } catch (error) {
        console.warn('Semantic context not available:', error);
        return { success: false, error: 'Semantic context features not available' };
      }
    },
    retry: false, // Don't retry initialization
    onError: (error: Error) => {
      console.warn('Failed to initialize semantic context:', error.message);
      // Don't show error toast - this is background initialization
    }
  });
}
