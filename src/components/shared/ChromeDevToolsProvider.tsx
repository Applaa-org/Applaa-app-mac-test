import React, { createContext, useContext, ReactNode } from 'react';
import { useChromeDevTools } from '@/hooks/useChromeDevTools';

interface ChromeDevToolsContextType {
  // State
  isConnected: boolean;
  consoleMessages: any[];
  networkRequests: any[];
  errors: any[];
  
  // Loading states
  isStarting: boolean;
  isStopping: boolean;
  isNavigating: boolean;
  isTakingScreenshot: boolean;
  
  // Actions
  start: () => void;
  stop: () => void;
  navigate: (url: string) => void;
  takeScreenshot: () => Promise<string | undefined>;
  clearMessages: () => void;
  
  // Data
  hasErrors: boolean;
  hasNetworkIssues: boolean;
  totalMessages: number;
  totalRequests: number;
}

const ChromeDevToolsContext = createContext<ChromeDevToolsContextType | null>(null);

interface ChromeDevToolsProviderProps {
  children: ReactNode;
  previewUrl?: string;
  appId?: number;
  enabled?: boolean;
}

export function ChromeDevToolsProvider({ 
  children, 
  previewUrl, 
  appId,
  enabled = true 
}: ChromeDevToolsProviderProps) {
  const devTools = useChromeDevTools(previewUrl, appId);

  // Only provide context if enabled
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ChromeDevToolsContext.Provider value={devTools}>
      {children}
    </ChromeDevToolsContext.Provider>
  );
}

export function useChromeDevToolsContext(): ChromeDevToolsContextType {
  const context = useContext(ChromeDevToolsContext);
  if (!context) {
    throw new Error('useChromeDevToolsContext must be used within ChromeDevToolsProvider');
  }
  return context;
}

// Hook for components that might not have DevTools enabled
export function useOptionalChromeDevTools(): ChromeDevToolsContextType | null {
  return useContext(ChromeDevToolsContext);
}
