/**
 * Hook to check if the current user has admin permission
 * for managing games and game templates
 */

import { useQuery } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';

export function useAdminPermission() {
  const ipcClient = IpcClient.getInstance();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-permission'],
    queryFn: async () => {
      const result = await ipcClient.wordpressCheckAdminPermission();
      return result.hasPermission;
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    hasPermission: data ?? false,
    isLoading,
  };
}

