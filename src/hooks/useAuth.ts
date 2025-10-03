import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { toast } from 'sonner';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'pro';
  createdAt: string;
  updatedAt: string;
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

export function useAuth() {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  // Check authentication status
  const { data: authData, isLoading: isCheckingAuth, refetch: refetchAuth } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().authGetCurrentUser();
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

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async (params: { email: string; password: string; fullName?: string }) => {
      const result = await IpcClient.getInstance().authSignUp(params);
      if (!result.success) {
        throw new Error(result.error || 'Sign up failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account created successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
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
      const result = await IpcClient.getInstance().authSignIn(params);
      if (!result.success) {
        throw new Error(result.error || 'Sign in failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Signed in successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
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
      const result = await IpcClient.getInstance().authSignOut();
      if (!result.success) {
        throw new Error(result.error || 'Sign out failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Signed out successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
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
      const result = await IpcClient.getInstance().authResetPassword(params);
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
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (params: { currentPassword: string; newPassword: string }) => {
      const result = await IpcClient.getInstance().authUpdatePassword(params);
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
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (params: { fullName?: string; avatarUrl?: string }) => {
      const result = await IpcClient.getInstance().authUpdateProfile(params);
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
      setAuthState(prev => ({ ...prev, error: error.message }));
    },
  });

  // Google OAuth mutation
  const signInWithGoogleMutation = useMutation({
    mutationFn: async () => {
      const result = await IpcClient.getInstance().authSignInWithGoogle();
      if (!result.success) {
        throw new Error(result.error || 'Google sign in failed');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Signed in with Google successfully');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      refetchAuth();
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
  const { user } = useAuth();
  
  return {
    isPro: user?.subscriptionTier === 'pro',
    isFree: user?.subscriptionTier === 'free',
    tier: user?.subscriptionTier || 'free',
  };
}
