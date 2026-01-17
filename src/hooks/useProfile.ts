import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro' | null;
  wordpress_user_id: number | null;
  wordpress_username: string | null;
  wordpress_display_name: string | null;
  wordpress_roles: string[] | null;
  monthly_credits: number | null;
  remaining_credits: number | null;
  credits_last_reset: string | null;
  total_credits_used: number | null;
  subscription_tier: 'free' | 'pro' | 'ultra' | 'business' | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const queryClient = useQueryClient();

  // Fetch current profile
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
    retry: 1,
    meta: {
      showErrorToast: true,
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { 
      username?: string;
      full_name?: string; 
      first_name?: string;
      last_name?: string;
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
