import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '../ipc/ipc_client';
import { useSettings } from './useSettings';
import { toast } from 'sonner';

export function useAIFeatures() {
  const { data: settings, updateSetting } = useSettings();
  const queryClient = useQueryClient();

  // Check if AI transformers are installed
  const {
    data: installStatus,
    isLoading,
    refetch: checkInstallation
  } = useQuery({
    queryKey: ['ai-transformers-installed'],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.checkAITransformersInstalled();
    },
    refetchInterval: false, // Don't auto-refetch
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Install AI transformers
  const installMutation = useMutation({
    mutationFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.installAITransformers();
    },
    onSuccess: async (result) => {
      if (result.success) {
        toast.success('AI features installed successfully!');
        await updateSetting('aiTransformersInstalled', true);
        // Refetch installation status
        queryClient.invalidateQueries({ queryKey: ['ai-transformers-installed'] });
      } else {
        toast.error(`Installation failed: ${result.message}`);
      }
    },
    onError: (error) => {
      toast.error(`Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const isInstalled = installStatus?.installed ?? settings?.aiTransformersInstalled ?? false;
  const hasShownDialog = settings?.hasShownAIFeaturesDialog ?? false;

  return {
    isInstalled,
    hasShownDialog,
    isLoading,
    installStatus,
    checkInstallation,
    installAIFeatures: installMutation.mutateAsync,
    isInstalling: installMutation.isPending,
    installError: installMutation.error,
  };
}


