import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IpcClient } from "../ipc/ipc_client";
import type { PromptItem } from "../lib/schemas";

export function usePrompts() {
  // Prompts feature temporarily disabled for MVP
  const queryClient = useQueryClient();
  const listQuery = {
    data: [] as PromptItem[],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };

  const createMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      description?: string;
      content: string;
      category?: string;
    }): Promise<PromptItem> => {
      const ipc = IpcClient.getInstance();
      return ipc.createPrompt(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
    meta: {
      showErrorToast: true,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: number;
      title: string;
      description?: string;
      content: string;
      category?: string;
    }): Promise<void> => {
      const ipc = IpcClient.getInstance();
      return ipc.updatePrompt(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
    meta: {
      showErrorToast: true,
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const ipc = IpcClient.getInstance();
      return ipc.deletePrompt(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
    meta: {
      showErrorToast: true,
    },
  });

  return {
    prompts: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
    createPrompt: async () => { throw new Error('Prompts disabled for MVP'); },
    updatePrompt: async () => { throw new Error('Prompts disabled for MVP'); },
    deletePrompt: async () => { throw new Error('Prompts disabled for MVP'); },
  };
}