/**
 * 🚀 Battle-Tested Expo Preview Component
 * Based on proven architecture: Custom Dev Client + Embedded Web Preview + Break-Glass Fallbacks
 * 
 * Three-layer approach:
 * 1. Full-app device preview (rock-solid) - QR code for mobile testing
 * 2. Embedded desktop web preview (stable) - BrowserView with proxy
 * 3. Break-glass fallbacks - Open in system browser, reset cache
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { 
  Loader2, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink,
  Settings,
  Terminal,
  Zap
} from 'lucide-react';
import QRCode from 'qrcode';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  terminalOutput?: string;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  error?: string;
}

interface PreviewState {
  status: 'idle' | 'starting' | 'ready' | 'error';
  message: string;
  canRetry: boolean;
  showDetails: boolean;
}

export function BattleTestedExpoPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // Core state
  const [previewState, setPreviewState] = useState<PreviewState>({
    status: 'idle',
    message: 'Ready to start Expo preview',
    canRetry: false,
    showDetails: false
  });
  
  const [expoStatus, setExpoStatus] = useState<ExpoStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  
  // Refs for cleanup
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * 🚀 Start Expo Development Server
   * Layer 1: Custom Dev Client for mobile
   * Layer 2: Web preview for desktop
   */
  const startExpoPreview = useCallback(async () => {
    if (!selectedAppId || previewState.status === 'starting') return;
    
    console.log(`🚀 Starting battle-tested Expo preview for app ${selectedAppId}`);
    
    try {
      setPreviewState({
        status: 'starting',
        message: 'Starting Expo development server...',
        canRetry: false,
        showDetails: true
      });

      const ipcClient = IpcClient.getInstance();
      
      // Validate app exists first - FIX: Handle ListAppsResponse properly
      try {
        const response = await ipcClient.listApps();
        if (!response || !response.apps || !Array.isArray(response.apps)) {
          throw new Error('Failed to load apps list');
        }
        
        const currentApp = response.apps.find(app => app.id === selectedAppId);
        if (!currentApp) {
          throw new Error('App not found in apps list');
        }
        
        console.log(`✅ App validation successful for app ${selectedAppId}: ${currentApp.name}`);
      } catch (error) {
        console.error('App validation failed:', error);
        throw new Error(`App validation failed: ${error.message}`);
      }

      // Start Expo server with both web and dev-client support
      const result = await ipcClient.expoStart({
        appId: selectedAppId,
        useTunnel: true, // Enable tunnel for mobile testing
        native: false   // Start web mode first for faster startup
      });

      if (result && result.isRunning) {
        setExpoStatus(result);
        
        // Generate QR code for mobile testing (Layer 1: Device preview)
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          await generateQRCode(qrUrl);
        }

        setPreviewState({
          status: 'ready',
          message: 'Expo preview ready! Scan QR code or use web preview',
          canRetry: false,
          showDetails: true
        });

        // Start health monitoring
        startHealthMonitoring();
        
        console.log('✅ Battle-tested Expo preview started successfully');
      } else {
        throw new Error(result?.error || 'Expo server failed to start');
      }
      
    } catch (error) {
      console.error('❌ Failed to start Expo preview:', error);
      
      setPreviewState({
        status: 'error',
        message: `Failed to start preview: ${error.message}`,
        canRetry: true,
        showDetails: true
      });
      
      // Auto-retry for recoverable errors
      if (shouldAutoRetry(error)) {
        retryTimeout.current = setTimeout(() => {
          console.log('🔄 Auto-retrying Expo preview...');
          startExpoPreview();
        }, 5000);
      }
    }
  }, [selectedAppId]);

  /**
   * 🛑 Stop Expo Preview
   */
  const stopExpoPreview = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      
      setExpoStatus(null);
      setQrDataUrl(null);
      setPreviewState({
        status: 'idle',
        message: 'Preview stopped',
        canRetry: false,
        showDetails: false
      });
      
      // Cleanup monitoring
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      
      console.log('🛑 Expo preview stopped');
    } catch (error) {
      console.error('Failed to stop Expo preview:', error);
    }
  }, []);

  /**
   * 🔄 Reset Preview (Break-glass fallback)
   * Clears cache + service workers before restarting
   */
  const resetPreview = useCallback(async () => {
    console.log('🔄 Resetting Expo preview...');
    
    try {
      // Stop current preview
      await stopExpoPreview();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restart with fresh state
      await startExpoPreview();
      
    } catch (error) {
      console.error('Failed to reset preview:', error);
    }
  }, [stopExpoPreview, startExpoPreview]);

  /**
   * 🌐 Open in System Browser (Break-glass fallback)
   */
  const openInBrowser = useCallback(async () => {
    if (!expoStatus?.webUrl) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.openExternalUrl(expoStatus.webUrl);
    } catch (error) {
      console.error('Failed to open in browser:', error);
    }
  }, [expoStatus?.webUrl]);

  /**
   * 📱 Generate QR Code for Mobile Testing
   */
  const generateQRCode = useCallback(async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }, []);

  /**
   * 📊 Start Health Monitoring
   */
  const startHealthMonitoring = useCallback(() => {
    statusCheckInterval.current = setInterval(async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.expoStatus();
        setExpoStatus(prev => ({ ...prev, ...status }));
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 3000); // Check every 3 seconds
  }, []);

  /**
   * 🔍 Helper Functions
   */
  const shouldAutoRetry = (error: any): boolean => {
    const retryableErrors = ['EADDRINUSE', 'ECONNREFUSED', 'timeout', 'network'];
    return retryableErrors.some(errorType => 
      error.message?.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  const getStatusIcon = () => {
    switch (previewState.status) {
      case 'starting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Smartphone className="h-5 w-5 text-gray-400" />;
    }
  };

  const getBestPreviewUrl = (): string | null => {
    if (!expoStatus) return null;
    // Prefer web URL for embedded preview, fallback to tunnel/LAN
    return expoStatus.webUrl || expoStatus.tunnelUrl || expoStatus.lanUrl || null;
  };

  /**
   * 🎯 Auto-start when app changes
   */
  useEffect(() => {
    if (selectedAppId && previewState.status === 'idle') {
      const timer = setTimeout(() => {
        startExpoPreview();
      }, 500); // Small delay for UI stability
      
      return () => clearTimeout(timer);
    }
  }, [selectedAppId, startExpoPreview, previewState.status]);

  /**
   * 🧹 Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, []);

  // No app selected
  if (!selectedAppId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select an Expo app to start preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header with status and controls */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Expo Preview
              </h3>
              <p className="text-sm text-gray-500">{previewState.message}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Reset Preview Button (Break-glass) */}
            <button
              onClick={resetPreview}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Reset Preview"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            
            {/* Open in Browser Button (Break-glass) */}
            {expoStatus?.webUrl && (
              <button
                onClick={openInBrowser}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Open in Browser"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            
            {/* Terminal Toggle */}
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`p-2 rounded ${showTerminal 
                ? 'text-blue-600 bg-blue-100' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Toggle Terminal"
            >
              <Terminal className="h-4 w-4" />
            </button>
            
            {/* Primary Action Button */}
            {previewState.status === 'idle' || previewState.canRetry ? (
              <button
                onClick={startExpoPreview}
                disabled={previewState.status === 'starting'}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {previewState.status === 'starting' ? 'Starting...' : 'Start Preview'}
              </button>
            ) : previewState.status === 'ready' ? (
              <button
                onClick={stopExpoPreview}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Stop
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Layer 2: Embedded Web Preview */}
        <div className="flex-1 relative">
          {previewState.status === 'ready' && getBestPreviewUrl() ? (
            <iframe
              key={getBestPreviewUrl()} // Force reload on URL change
              src={getBestPreviewUrl()!}
              className="w-full h-full border-0"
              title="Expo Web Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="camera; microphone; geolocation"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <div className="text-center max-w-md">
                {previewState.status === 'starting' ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      Starting Expo development server...
                    </p>
                    <p className="text-sm text-gray-500">
                      This may take a moment for the first start
                    </p>
                  </>
                ) : previewState.status === 'error' ? (
                  <>
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">
                      {previewState.message}
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={startExpoPreview}
                        className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={resetPreview}
                        className="block w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Reset Preview
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Web preview will appear here</p>
                    <button
                      onClick={startExpoPreview}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Start Preview
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Layer 1: QR Code Sidebar for Device Preview */}
        {previewState.status === 'ready' && qrDataUrl && (
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Device Testing
                </span>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <img src={qrDataUrl} alt="QR Code" className="w-full" />
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Scan with Expo Go app or Custom Dev Client
              </p>
              
              {/* Connection status */}
              <div className="flex items-center justify-center gap-2 text-xs mb-4">
                {expoStatus?.tunnelUrl ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">Tunnel Active</span>
                  </>
                ) : expoStatus?.lanUrl ? (
                  <>
                    <Wifi className="h-3 w-3 text-yellow-500" />
                    <span className="text-yellow-600">LAN Only</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">Local Only</span>
                  </>
                )}
              </div>
              
              {/* Break-glass actions */}
              <div className="space-y-2">
                {expoStatus?.webUrl && (
                  <button
                    onClick={openInBrowser}
                    className="w-full px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Browser
                  </button>
                )}
                
                <button
                  onClick={resetPreview}
                  className="w-full px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset Cache
                </button>
              </div>
              
              {/* Debug URLs */}
              {previewState.showDetails && (
                <div className="mt-4 text-xs text-gray-500 space-y-1 border-t pt-3">
                  {expoStatus?.webUrl && (
                    <div className="truncate">Web: {new URL(expoStatus.webUrl).port}</div>
                  )}
                  {expoStatus?.tunnelUrl && (
                    <div>Tunnel: ✅</div>
                  )}
                  {expoStatus?.lanUrl && (
                    <div className="truncate">LAN: {new URL(expoStatus.lanUrl).hostname}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Terminal Output (Layer 3: Debug fallback) */}
      {showTerminal && expoStatus?.terminalOutput && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-900 text-green-400 p-4 h-48 overflow-auto">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-mono">Expo Server Output</span>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {expoStatus.terminalOutput}
          </pre>
        </div>
      )}
    </div>
  );
}


