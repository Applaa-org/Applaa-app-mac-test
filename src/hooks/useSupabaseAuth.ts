import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { toast } from 'sonner';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string; // Database field name
  avatarUrl?: string;
  avatar_url?: string; // Database field name
  subscriptionTier: 'free' | 'pro' | 'ultra' | 'business';
  subscription_tier?: 'free' | 'pro' | 'ultra' | 'business'; // Database field name
  createdAt: string;
  created_at?: string; // Database field name
  updatedAt: string;
  updated_at?: string; // Database field name
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
}

export function useSupabaseAuth() {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  // Check Supabase configuration
  const { data: configStatus } = useQuery({
    queryKey: ['supabase', 'config'],
    queryFn: async () => {
      return await IpcClient.getInstance().supabaseCheckConfiguration();
    },
    staleTime: 5 * 60 * 1000, // Consider config status stale after 5 minutes
  });

  // Initialize Supabase from settings or environment
  const initializeAuth = useCallback(async () => {
    try {
      const result = await IpcClient.getInstance().supabaseInitializeFromSettings();
      if (!result.success) {
        console.warn('Supabase not configured:', result.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      return false;
    }
  }, []);

  // Check authentication status
  const { data: authData, isLoading: isCheckingAuth, refetch: refetchAuth } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      const initialized = await initializeAuth();
      if (!initialized) {
        return { isAuthenticated: false, user: null, session: null };
      }

      const result = await IpcClient.getInstance().supabaseIsAuthenticated();
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

  // Listen for OAuth callback from main process
  useEffect(() => {
    const handleOAuthCallback = (data: { accessToken: string; refreshToken: string; expiresIn: number }) => {
      console.log('OAuth callback received:', data);

      // Set the session in Supabase client
      const setSession = async () => {
        try {
          // We need to call the main process to set the session
          await IpcClient.getInstance().supabaseSetSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
          });

          toast.success('Successfully signed in with Google!');
          queryClient.invalidateQueries({ queryKey: ['auth'] });
          refetchAuth();
        } catch (error) {
          console.error('Failed to set OAuth session:', error);
          toast.error('Failed to complete Google sign in');
        }
      };

      setSession();
    };

    // Listen for OAuth callback events using the preload API
    const electronAPI = (window as any).electron;
    if (electronAPI) {
      electronAPI.ipcRenderer.on('oauth-callback', handleOAuthCallback);
    }

    return () => {
      if (electronAPI) {
        electronAPI.ipcRenderer.removeListener('oauth-callback', handleOAuthCallback);
      }
    };
  }, []); // Empty dependency array - only set up listener once

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async (params: { email: string; password: string; fullName?: string; firstName?: string; lastName?: string }) => {
      const result = await IpcClient.getInstance().supabaseSignUp(params);
      if (!result.success) {
        throw new Error(result.error || 'Sign up failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account created successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetchAuth();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async (params: { email: string; password: string }) => {
      const result = await IpcClient.getInstance().supabaseSignIn(params);
      if (!result.success) {
        throw new Error(result.error || 'Sign in failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Signed in successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetchAuth();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const result = await IpcClient.getInstance().supabaseSignOut();
      if (!result.success) {
        throw new Error(result.error || 'Sign out failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Signed out successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (params: { email: string }) => {
      const result = await IpcClient.getInstance().supabaseResetPassword(params);
      if (!result.success) {
        throw new Error(result.error || 'Password reset failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset email sent');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (params: { newPassword: string }) => {
      const result = await IpcClient.getInstance().supabaseUpdatePassword(params);
      if (!result.success) {
        throw new Error(result.error || 'Password update failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { fullName?: string; avatarUrl?: string }) => {
      const result = await IpcClient.getInstance().supabaseUpdateProfile(updates);
      if (!result.success) {
        throw new Error(result.error || 'Profile update failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      refetchAuth();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Sign in with Google OAuth mutation
  const signInWithGoogleMutation = useMutation({
    mutationFn: async () => {
      const result = await IpcClient.getInstance().supabaseSignInWithGoogle();
      if (!result.success) {
        throw new Error(result.error || 'Google sign in failed');
      }
      return result;
    },
    onSuccess: (data) => {
      // Open the OAuth URL in the default browser
      if (data.url) {
        (window as any).applaaShell.openExternal(data.url);
      }
      toast.success(data.message || 'Opening Google sign in...');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  return {
    // Auth state
    ...authState,
    isLoading: isCheckingAuth || authState.isLoading,

    // Actions
    signUp: signUpMutation.mutateAsync,
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    signInWithGoogle: signInWithGoogleMutation.mutateAsync,
    refetchAuth,

    // Mutation states
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isSigningInWithGoogle: signInWithGoogleMutation.isPending,
  };
}

// Hook for checking if user has specific subscription tier
export function useSubscriptionTier() {
  const { user } = useSupabaseAuth();

  
  const tier = (user?.subscriptionTier || 'free') as 'free' | 'pro' | 'ultra' | 'business';
  const isPaidTier = tier === 'pro' || tier === 'ultra' || tier === 'business';


  return {
    tier,
    isPro: isPaidTier,
    isFree: tier === 'free',
  };
}

// Hook for protected routes/features
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  return {
    isAuthenticated,
    isLoading,
    canAccess: isAuthenticated && !isLoading,
    shouldRedirectToAuth: !isAuthenticated && !isLoading,
  };
}

