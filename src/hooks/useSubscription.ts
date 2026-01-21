import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { toast } from 'sonner';
import { useSupabaseAuth } from './useSupabaseAuth';

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  planName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
}

export interface SubscriptionStatus {
  subscription: Subscription | null;
  isPro: boolean;
  tier: 'free' | 'pro' | 'ultra' | 'business';
  trialStart?: string;
  trialEnd?: string;
}

export function useSubscription() {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();

  // Get current subscription
  const { data, isLoading, error, refetch } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      return await IpcClient.getInstance().subscriptionGetCurrent();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (params: { priceId: string; trialDays?: number }) => {
      return await IpcClient.getInstance().subscriptionCreateCheckout(params);
    },
    onSuccess: (data) => {
      // Open checkout URL in external browser
      if (data.url && (window as any).applaaShell) {
        (window as any).applaaShell.openExternal(data.url);
        toast.success('Opening checkout page...');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create checkout: ${error.message}`);
    },
  });

  // Create portal session mutation
  const createPortalMutation = useMutation({
    mutationFn: async (returnUrl: string) => {
      return await IpcClient.getInstance().subscriptionCreatePortal(returnUrl);
    },
    onSuccess: (data) => {
      // Open portal URL in external browser
      if (data.url && (window as any).applaaShell) {
        (window as any).applaaShell.openExternal(data.url);
        toast.success('Opening subscription management...');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to open portal: ${error.message}`);
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (params: { subscriptionId: string; cancelAtPeriodEnd?: boolean }) => {
      return await IpcClient.getInstance().subscriptionCancel(params);
    },
    onSuccess: () => {
      toast.success('Subscription canceled successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
  });

  // Resume subscription mutation
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return await IpcClient.getInstance().subscriptionResume(subscriptionId);
    },
    onSuccess: () => {
      toast.success('Subscription resumed successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to resume subscription: ${error.message}`);
    },
  });

  return {
    subscription: data?.subscription || null,
    isPro: data?.isPro || false,
    tier: data?.tier || 'free',
    trialStart: data?.trialStart,
    trialEnd: data?.trialEnd,
    isLoading,
    error,
    refetch,
    createCheckout: createCheckoutMutation.mutateAsync,
    createPortal: createPortalMutation.mutateAsync,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
    resumeSubscription: resumeSubscriptionMutation.mutateAsync,
    isCreatingCheckout: createCheckoutMutation.isPending,
    isCreatingPortal: createPortalMutation.isPending,
    isCanceling: cancelSubscriptionMutation.isPending,
    isResuming: resumeSubscriptionMutation.isPending,
  };
}

// Hook for checking if user has pro subscription
export function useIsPro() {
  const { isPro, tier } = useSubscription();
  return {
    isPro,
    isFree: tier === 'free',
    tier,
  };
}

// Hook for checking if user is in trial
export function useTrialStatus() {
  const { trialStart, trialEnd, isPro } = useSubscription();
  
  if (!trialStart || !trialEnd) {
    return {
      isInTrial: false,
      trialStart: null,
      trialEnd: null,
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const trialEndDate = new Date(trialEnd);
  const isInTrial = now < trialEndDate && (isPro || trialEndDate > now);
  const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    isInTrial,
    trialStart,
    trialEnd,
    daysRemaining,
  };
}
