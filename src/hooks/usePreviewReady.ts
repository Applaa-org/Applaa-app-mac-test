import { useAtomValue } from 'jotai';
import { appUrlAtom } from '@/atoms/appAtoms';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { isStreamingAtom } from '@/atoms/chatAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { useState, useEffect, useRef } from 'react';
import { useCheckProblems } from './useCheckProblems';

export function usePreviewReady() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appUrl = useAtomValue(appUrlAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [previewType, setPreviewType] = useState<'web' | 'mobile' | null>(null);
  const lastReadyAppId = useRef<number | null>(null);
  
  // Check for problems - only show ready if no errors exist
  const { problemReport } = useCheckProblems(selectedAppId);

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
      // ✅ CRITICAL: Check if there are any errors (problems with severity 'error')
      // Don't show "App is Ready to Publish!" if there are errors
      const hasErrors = problemReport?.problems?.some(
        p => p.severity === 'error'
      ) ?? false;
      
      if (hasErrors) {
        setIsPreviewReady(false);
        setPreviewType(null);
        return;
      }
      
      // Check web app preview ready only
      // Don't show preview popup if chat is streaming
      // CRITICAL: Only show preview ready if the URL belongs to the current app
      if (appUrl?.originalUrl && appUrl.appId === selectedAppId && !isStreaming) {
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
  }, [selectedAppId, appUrl?.originalUrl, appUrl?.appId, isStreaming, problemReport]);

  return { isPreviewReady, previewType };
}
