import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro' | 'ultra' | 'business' | null;
  wordpress_user_id: number | null;
  wordpress_username: string | null;
  wordpress_display_name: string | null;
  wordpress_roles: string[] | null;
  monthly_credits: number | null;
  remaining_credits: number | null;
  credits_last_reset: string | null;
  total_credits_used: number | null;
  total_tokens_used: number | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const queryClient = useQueryClient();

  // Read cached auth status without triggering auth checks (avoids race conditions during login)
  // This is safer than calling useSupabaseAuth/useWordPressAuth hooks directly
  const supabaseAuthData = queryClient.getQueryData<{ isAuthenticated: boolean }>(['auth', 'status']);
  const wpAuthData = queryClient.getQueryData<{ isAuthenticated: boolean }>(['wordpress', 'auth', 'status']);
  
  // Check if auth queries are still loading or haven't been initialized yet
  const supabaseQuery = queryClient.getQueryState(['auth', 'status']);
  const wpQuery = queryClient.getQueryState(['wordpress', 'auth', 'status']);
  
  // If queries don't exist yet or are pending, we're still loading
  const isAuthLoading = 
    !supabaseQuery || !wpQuery || // Queries not initialized yet
    supabaseQuery.status === 'pending' || 
    wpQuery.status === 'pending';
  
  // Only consider authenticated if we have data AND it says authenticated
  const isAuthenticated = Boolean(
    (supabaseAuthData?.isAuthenticated) || 
    (wpAuthData?.isAuthenticated)
  );

  // Fetch current profile — only when authenticated
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().getCurrentProfile();
      if (!result.success) {
        throw new Error('Failed to fetch profile');
      }
      return result.profile;
    },
    // Don't fetch profile until auth check is done AND user is logged in
    enabled: !isAuthLoading && isAuthenticated,
    retry: 1,
    meta: {
      showErrorToast: false, // We handle errors gracefully in the UI now
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { 
      username?: string;
      full_name?: string; 
      avatar_url?: string;
    }) => {
      const result = await IpcClient.getInstance().updateProfile(updates);
      if (!result.success) {
        throw new Error('Failed to update profile');
      }
      return result.profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      showSuccess('Profile updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to update profile');
    },
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}
