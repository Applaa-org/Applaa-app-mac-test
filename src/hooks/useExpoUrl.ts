import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';

export function useExpoUrl() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoUrl, setExpoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedAppId) {
      setExpoUrl(null);
      return;
    }

    const checkExpoStatus = async () => {
      try {
        setIsLoading(true);
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.simpleExpoStatus();
        
        if (status && status.isRunning) {
          // Prioritize webUrl for iframe display, fallback to tunnelUrl
          const url = status.webUrl || status.tunnelUrl || status.lanUrl;
          if (url) {
            setExpoUrl(url);
          }
        } else {
          setExpoUrl(null);
        }
      } catch (error) {
        console.error('Failed to get Expo status:', error);
        setExpoUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Check immediately
    checkExpoStatus();

    // Poll for updates every 2 seconds
    const interval = setInterval(checkExpoStatus, 2000);

    return () => clearInterval(interval);
  }, [selectedAppId]);

  return { expoUrl, isLoading };
}
