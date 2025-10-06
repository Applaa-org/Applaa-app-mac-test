import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { toast } from 'sonner';

export interface WordPressUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  avatar_url?: string;
  capabilities: string[];
}

export interface WordPressAuthSession {
  token: string;
  user: WordPressUser;
  expires_at: number;
}

export interface WordPressAuthState {
  isAuthenticated: boolean;
  user: WordPressUser | null;
  session: WordPressAuthSession | null;
  isLoading: boolean;
  error: string | null;
}

export function useWordPressAuth() {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<WordPressAuthState>({
    isAuthenticated: false,
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  // Check WordPress configuration
  const { data: configStatus } = useQuery({
    queryKey: ['wordpress', 'config'],
    queryFn: async () => {
      return await IpcClient.getInstance().wordpressCheckConfiguration();
    },
    staleTime: 5 * 60 * 1000, // Consider config status stale after 5 minutes
  });

  // Check authentication status
  const { data: authData, isLoading: isCheckingAuth, refetch: refetchAuth } = useQuery({
    queryKey: ['wordpress', 'auth', 'status'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().wordpressGetCurrentUser();
      return result;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Update auth state when data changes
  useEffect(() => {
    if (authData) {
      setAuthState({
        isAuthenticated: authData.isAuthenticated,
        user: authData.user || null,
        session: authData.session || null,
        isLoading: isCheckingAuth,
        error: null,
      });
    }
  }, [authData, isCheckingAuth]);

  // WordPress Login mutation
  const loginMutation = useMutation({
    mutationFn: async (params: { username: string; password: string }) => {
      const result = await IpcClient.getInstance().wordpressLogin(params);
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Login successful');
      queryClient.invalidateQueries({ queryKey: ['wordpress'] });
      refetchAuth();
      // Force refresh authentication state
      setTimeout(() => {
        refetchAuth();
      }, 100);
      // Immediately update local state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: data.user || prev.user,
        session: data.session || prev.session,
        error: null,
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // WordPress Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const result = await IpcClient.getInstance().wordpressLogout();
      if (!result.success) {
        throw new Error(result.error || 'Logout failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Logged out successfully');
      queryClient.invalidateQueries({ queryKey: ['wordpress'] });
      setAuthState({
        isAuthenticated: false,
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // WordPress OAuth mutation
  const oauthMutation = useMutation({
    mutationFn: async (params: { provider: string }) => {
      const result = await IpcClient.getInstance().wordpressOAuthLogin(params);
      if (!result.success) {
        throw new Error(result.error || 'OAuth login failed');
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.oauthUrl) {
        // Open OAuth URL in external browser
        window.open(data.oauthUrl, '_blank');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Check capability mutation
  const checkCapabilityMutation = useMutation({
    mutationFn: async (params: { capability: string }) => {
      const result = await IpcClient.getInstance().wordpressCheckCapability(params);
      return result;
    },
    onError: (error: Error) => {
      console.error('Failed to check capability:', error);
    },
  });

  return {
    // Auth state
    ...authState,
    isLoading: isCheckingAuth || authState.isLoading,

    // Configuration
    configStatus,

    // Actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    oauthLogin: oauthMutation.mutateAsync,
    checkCapability: checkCapabilityMutation.mutateAsync,
    refetchAuth,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isOAuthLoggingIn: oauthMutation.isPending,
    isCheckingCapability: checkCapabilityMutation.isPending,
  };
}

// Hook for checking WordPress user capabilities
export function useWordPressCapability(capability: string) {
  const { checkCapability, isCheckingCapability } = useWordPressAuth();
  const [hasCapability, setHasCapability] = useState<boolean>(false);

  const checkCapabilityForUser = useCallback(async () => {
    try {
      const result = await checkCapability({ capability });
      setHasCapability(result.hasCapability);
    } catch (error) {
      console.error('Failed to check capability:', error);
      setHasCapability(false);
    }
  }, [checkCapability, capability]);

  useEffect(() => {
    checkCapabilityForUser();
  }, [checkCapabilityForUser]);

  return {
    hasCapability,
    isCheckingCapability,
    refetch: checkCapabilityForUser,
  };
}

// Hook for checking if user has admin role
export function useWordPressAdmin() {
  const { user } = useWordPressAuth();
  
  return {
    isAdmin: user?.roles?.includes('administrator') || false,
    isEditor: user?.roles?.includes('editor') || false,
    isAuthor: user?.roles?.includes('author') || false,
    isContributor: user?.roles?.includes('contributor') || false,
    isSubscriber: user?.roles?.includes('subscriber') || false,
  };
}
