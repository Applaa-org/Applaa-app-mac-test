import { useAtomValue } from 'jotai';
import { appUrlAtom } from '@/atoms/appAtoms';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { useState, useEffect, useRef } from 'react';

export function usePreviewReady() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appUrl = useAtomValue(appUrlAtom);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [previewType, setPreviewType] = useState<'web' | 'mobile' | null>(null);
  const lastReadyAppId = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedAppId) {
      setIsPreviewReady(false);
      setPreviewType(null);
      lastReadyAppId.current = null;
      return;
    }

    // Reset state when app changes
    if (selectedAppId !== lastReadyAppId.current) {
      setIsPreviewReady(false);
      setPreviewType(null);
    }

    const checkPreviewReady = async () => {
      // Check web app preview ready only
      if (appUrl?.originalUrl) {
        setIsPreviewReady(true);
        setPreviewType('web');
        lastReadyAppId.current = selectedAppId;
        return;
      }

      // For now, only show popup for web apps
      // Mobile app detection is disabled
      setIsPreviewReady(false);
      setPreviewType(null);
    };

    checkPreviewReady();
    
    // Poll every 2 seconds
    const interval = setInterval(checkPreviewReady, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId, appUrl?.originalUrl]);

  return { isPreviewReady, previewType };
}
