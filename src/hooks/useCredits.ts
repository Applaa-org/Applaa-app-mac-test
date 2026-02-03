import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';

export interface CreditBalance {
  remaining: number;
  monthly: number;
  totalUsed: number;
  lastReset: string | null;
}

export interface CreditUsage {
  id: string;
  operationType: string;
  creditsUsed: number;
  tokensUsed: number;
  appId: string | null;
  chatId: string | null;
  metadata: any;
  createdAt: string;
}

export function useCredits() {
  const queryClient = useQueryClient();

  // Fetch current credit balance
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().getCreditBalance();
      if (!result.success) {
        throw new Error('Failed to fetch credit balance');
      }
      return result.balance;
    },
    retry: 1,
    meta: {
      showErrorToast: true,
    },
  });

  // Get usage history
  const {
    data: usageHistory,
    isLoading: isLoadingHistory,
    error: usageError,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ['credits', 'usage'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().getCreditUsage();
      if (!result.success) {
        throw new Error('Failed to fetch usage history');
      }
      return result.history;
    },
    retry: 1,
    meta: {
      showErrorToast: false, // Don't show toast for usage history errors
    },
  });

  // Get token usage summary (total + per-app) for current user
  const {
    data: tokenUsageSummary,
    isLoading: isLoadingTokenSummary,
    refetch: refetchTokenSummary,
  } = useQuery({
    queryKey: ['credits', 'token-usage-summary'],
    queryFn: async () => {
      const result = await IpcClient.getInstance().getTokenUsageSummary();
      if (!result.success) {
        throw new Error('Failed to fetch token usage summary');
      }
      return { totalTokens: result.totalTokens, byApp: result.byApp };
    },
    retry: 1,
    meta: {
      showErrorToast: false,
    },
  });

  // Check credits mutation (for checking before operations)
  const checkMutation = useMutation({
    mutationFn: async (params: { operationType: string; cost?: number }) => {
      const result = await IpcClient.getInstance().checkCredits(params.operationType, params.cost);
      if (!result.success) {
        throw new Error('Failed to check credits');
      }
      return result;
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to check credits');
    },
  });

  // Reset credits mutation (for testing/manual reset)
  const resetMutation = useMutation({
    mutationFn: async () => {
      const result = await IpcClient.getInstance().resetCredits();
      if (!result.success) {
        throw new Error('Failed to reset credits');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      showSuccess('Credits reset successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to reset credits');
    },
  });

  return {
    balance,
    usageHistory,
    tokenUsageSummary,
    isLoading,
    isLoadingHistory,
    isLoadingTokenSummary,
    error,
    usageError,
    refetch,
    refetchUsage,
    refetchTokenSummary,
    checkCredits: checkMutation.mutateAsync,
    isChecking: checkMutation.isPending,
    resetCredits: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  };
}
