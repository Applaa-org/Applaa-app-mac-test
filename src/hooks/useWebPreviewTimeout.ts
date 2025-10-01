import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { isStreamingAtom } from '@/atoms/chatAtoms';
import { selectedAppIdAtom, appUrlAtom } from '@/atoms/appAtoms';
import { useCheckProblems } from './useCheckProblems';
import { IpcClient } from '@/ipc/ipc_client';

interface WebPreviewTimeoutState {
  shouldShowTimeoutPopup: boolean;
  timeoutReason: string;
  resetTimeout: () => void;
}

const TIMEOUT_DURATION = 180000; // 30 seconds

export function useWebPreviewTimeout(): WebPreviewTimeoutState {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // 🚨 DYAD PATTERN: Use simple global streaming atom
  const isStreaming = useAtomValue(isStreamingAtom);
  
  const appUrl = useAtomValue(appUrlAtom);
  const { problemReport } = useCheckProblems(selectedAppId);
  
  const [shouldShowTimeoutPopup, setShouldShowTimeoutPopup] = useState(false);
  const [timeoutReason, setTimeoutReason] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastAppUrlRef = useRef<string | null>(null);

  // Check if web app server is running by checking if we have a valid app URL
  const checkWebAppStatus = useCallback((): boolean => {
    return appUrl?.appUrl !== null && appUrl?.appUrl !== undefined && appUrl.appUrl !== '';
  }, [appUrl]);

  // Reset timeout tracking
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShouldShowTimeoutPopup(false);
    setTimeoutReason('');
    startTimeRef.current = null;
    lastAppUrlRef.current = null;
  }, []);

  // Main timeout logic
  useEffect(() => {
    // Don't start timeout if chat is still streaming for this specific app
    if (isStreaming) {
      resetTimeout();
      return;
    }

    // Don't start timeout if there are problems in the problem tab
    if (problemReport?.problems && problemReport.problems.length > 0) {
      resetTimeout();
      return;
    }

    // Don't start timeout if no app is selected
    if (!selectedAppId) {
      resetTimeout();
      return;
    }

    // Start timeout tracking when chat stops and no problems
    if (!isStreaming && !problemReport?.problems?.length && selectedAppId) {
      // Check if web app is already running
      const isRunning = checkWebAppStatus();
      if (isRunning) {
        // Web app is already running, no need for timeout
        resetTimeout();
        return;
      }

      // Web app is not running, start timeout
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        lastAppUrlRef.current = appUrl?.appUrl || null;
      }

      // Set timeout for 30 seconds
      timeoutRef.current = setTimeout(() => {
        // Double-check conditions before showing popup
        const stillNotStreaming = !isStreaming;
        const stillNoProblems = !problemReport?.problems?.length;
        const webAppStillNotRunning = !checkWebAppStatus();

        if (stillNotStreaming && stillNoProblems && webAppStillNotRunning) {
          setShouldShowTimeoutPopup(true);
          setTimeoutReason('Web app server is taking longer than expected. Try restarting or rebuilding the app.');
        }
      }, TIMEOUT_DURATION);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isStreaming, problemReport?.problems?.length, selectedAppId, checkWebAppStatus, resetTimeout]);

  // Monitor web app status changes
  useEffect(() => {
    if (!selectedAppId || isStreaming) return;

    const checkInterval = setInterval(() => {
      const isRunning = checkWebAppStatus();
      
      // If web app started running, reset timeout
      if (isRunning && !lastAppUrlRef.current) {
        resetTimeout();
      }
      
      lastAppUrlRef.current = appUrl?.appUrl || null;
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [selectedAppId, isStreaming, checkWebAppStatus, resetTimeout, appUrl?.appUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    shouldShowTimeoutPopup,
    timeoutReason,
    resetTimeout,
  };
}
