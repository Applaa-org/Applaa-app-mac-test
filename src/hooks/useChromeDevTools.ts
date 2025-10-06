import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';
import { errorDetector, ErrorAnalysis } from '../services/error-detector';

export interface DevToolsMessage {
  type: 'console' | 'network' | 'error' | 'performance';
  timestamp: number;
  level?: 'log' | 'warn' | 'error' | 'info';
  message: string;
  url?: string;
  status?: number;
  method?: string;
  stack?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
  type: string;
}

export function useChromeDevTools(previewUrl?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<DevToolsMessage[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [errors, setErrors] = useState<DevToolsMessage[]>([]);
  
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const hasNavigated = useRef<boolean>(false);
  const ipcClient = IpcClient.getInstance();

  // Start Chrome DevTools MCP
  const startMutation = useMutation({
    mutationFn: () => ipcClient.startChromeDevTools(),
    onSuccess: (result) => {
      if (result.success) {
        setIsConnected(true);
        console.log('✅ Chrome DevTools MCP started');
      } else {
        console.error('❌ Failed to start Chrome DevTools MCP:', result.error);
      }
    },
    onError: (error) => {
      console.error('❌ Error starting Chrome DevTools MCP:', error);
    }
  });

  // Stop Chrome DevTools MCP
  const stopMutation = useMutation({
    mutationFn: () => ipcClient.stopChromeDevTools(),
    onSuccess: () => {
      setIsConnected(false);
      console.log('🛑 Chrome DevTools MCP stopped');
    },
    onError: (error) => {
      console.error('❌ Error stopping Chrome DevTools MCP:', error);
    }
  });

  // Navigate to preview URL
  const navigateMutation = useMutation({
    mutationFn: (url: string) => ipcClient.navigateChromeDevTools({ url }),
    onSuccess: (result, url) => {
      if (result.success) {
        console.log(`🌐 Navigated to preview: ${url}`);
        startPolling();
      } else {
        console.error('❌ Failed to navigate to preview:', result.error);
      }
    },
    onError: (error) => {
      console.error('❌ Error navigating to preview:', error);
    }
  });

  // Take screenshot
  const screenshotMutation = useMutation({
    mutationFn: () => ipcClient.takeScreenshot(),
    onSuccess: (result) => {
      if (result.success && result.data) {
        console.log('📸 Screenshot taken');
        return result.data;
      } else {
        console.error('❌ Failed to take screenshot:', result.error);
      }
    },
    onError: (error) => {
      console.error('❌ Error taking screenshot:', error);
    }
  });

  // Check connection status
  const { data: status } = useQuery({
    queryKey: ['chrome-devtools-status'],
    queryFn: () => ipcClient.getChromeDevToolsStatus(),
    refetchInterval: 5000, // Check every 5 seconds
    enabled: true
  });

  // Update connection status
  useEffect(() => {
    if (status) {
      setIsConnected(status.connected);
    }
  }, [status]);

  // Reset navigation flag when preview URL changes
  useEffect(() => {
    hasNavigated.current = false;
  }, [previewUrl]);

  // Auto-start when preview URL is available
  useEffect(() => {
    if (previewUrl && !isConnected && !startMutation.isPending) {
      console.log('🚀 Auto-starting Chrome DevTools for preview:', previewUrl);
      startMutation.mutate();
    }
  }, [previewUrl, isConnected]); // Removed startMutation from dependencies to prevent infinite loop

  // Auto-navigate when both connected and URL available
  useEffect(() => {
    if (isConnected && previewUrl && !navigateMutation.isPending && !hasNavigated.current) {
      console.log('🌐 Auto-navigating to preview:', previewUrl);
      hasNavigated.current = true;
      navigateMutation.mutate(previewUrl);
    }
  }, [isConnected, previewUrl]); // Removed navigateMutation from dependencies to prevent infinite loop

  // Polling functions
  const startPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      if (!isConnected) return;

      try {
        // Get console messages
        const messages = await ipcClient.getConsoleMessages();
        if (messages.length > 0) {
          setConsoleMessages(prev => {
            const newMessages = messages.filter(msg => 
              !prev.some(existing => 
                existing.timestamp === msg.timestamp && 
                existing.message === msg.message
              )
            );
            return [...prev, ...newMessages].slice(-100); // Keep last 100 messages
          });

          // Separate errors and analyze them
          const errorMessages = messages.filter(msg => 
            msg.type === 'error' || msg.level === 'error'
          );
          if (errorMessages.length > 0) {
            setErrors(prev => [...prev, ...errorMessages].slice(-50));
            
            // Analyze new errors and report to chat stream
            errorMessages.forEach(error => {
              const analysis = errorDetector.analyzeError(error);
              if (analysis && errorDetector.shouldReportToChat(error, analysis)) {
                const errorReport = errorDetector.generateErrorReport(error, analysis);
                
                // Send error report to chat stream
                console.log('🚨 Auto-reporting error to chat stream:', errorReport);
                
                // TODO: Integrate with chat stream system
                // This would send the error report as a system message to the chat
                // ipcClient.sendChatMessage(errorReport);
              }
            });
          }
        }

        // Get network requests
        const requests = await ipcClient.getNetworkRequests();
        if (requests.length > 0) {
          setNetworkRequests(prev => {
            const newRequests = requests.filter(req => 
              !prev.some(existing => 
                existing.url === req.url && 
                existing.timestamp === req.timestamp
              )
            );
            return [...prev, ...newRequests].slice(-100); // Keep last 100 requests
          });
        }

      } catch (error) {
        console.warn('⚠️ Error polling DevTools data:', error);
      }
    }, 1000); // Poll every second
  }, [isConnected, ipcClient]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Manual actions
  const start = useCallback(() => {
    startMutation.mutate();
  }, [startMutation]);

  const stop = useCallback(() => {
    stopMutation.mutate();
    stopPolling();
  }, [stopMutation, stopPolling]);

  const navigate = useCallback((url: string) => {
    navigateMutation.mutate(url);
  }, [navigateMutation]);

  const takeScreenshot = useCallback(() => {
    return screenshotMutation.mutateAsync();
  }, [screenshotMutation]);

  const clearMessages = useCallback(() => {
    setConsoleMessages([]);
    setNetworkRequests([]);
    setErrors([]);
  }, []);

  return {
    // State
    isConnected,
    consoleMessages,
    networkRequests,
    errors,
    
    // Loading states
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isNavigating: navigateMutation.isPending,
    isTakingScreenshot: screenshotMutation.isPending,
    
    // Actions
    start,
    stop,
    navigate,
    takeScreenshot,
    clearMessages,
    
    // Data
    hasErrors: errors.length > 0,
    hasNetworkIssues: networkRequests.some(req => req.status >= 400),
    totalMessages: consoleMessages.length,
    totalRequests: networkRequests.length
  };
}
