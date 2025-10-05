import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode from 'qrcode';
import { Smartphone, RefreshCw, Wifi, WifiOff, Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string;
  lastHotReload?: number;
}

interface DeviceFrame {
  name: string;
  width: number;
  height: number;
  scale: number;
}

const DEVICE_FRAMES: Record<string, DeviceFrame> = {
  'iphone-15-pro': {
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    scale: 0.6
  },
  'pixel-7': {
    name: 'Pixel 7',
    width: 412,
    height: 915,
    scale: 0.55
  }
};

export function SolidExpoPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [deviceFrame, setDeviceFrame] = useState<string>('iphone-15-pro');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout>();
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Get current device frame
  const currentDevice = DEVICE_FRAMES[deviceFrame];

  // Generate QR Code
  const generateQRCode = useCallback(async (url: string) => {
    if (!url) return;
    
    try {
      console.log('🔗 Generating QR code for:', url);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrDataUrl);
      console.log('✅ QR code generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      setQrCodeDataUrl('');
    }
  }, []);

  // Start Expo Development Server
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId) return;

    setIsLoading(true);
    setError('');
    setConnectionStatus('connecting');
    retryCount.current = 0;

    try {
      console.log('🚀 Starting Expo server for app:', selectedAppId);
      const ipcClient = IpcClient.getInstance();
      
      // Start Expo processes (try dual first, fallback to original)
      await ipcClient.startExpo({ 
        appId: selectedAppId, 
        useTunnel: true 
      });
      
      console.log('✅ Expo server start command sent');
      
      // Start polling for status
      startStatusPolling();
      
    } catch (error) {
      console.error('❌ Failed to start Expo server:', error);
      setError(`Failed to start Expo server: ${error}`);
      setConnectionStatus('disconnected');
      setIsLoading(false);
    }
  }, [selectedAppId]);

  // Stop Expo Development Server
  const stopExpoServer = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      console.log('🛑 Stopping Expo server for app:', selectedAppId);
      const ipcClient = IpcClient.getInstance();
      await ipcClient.stopExpo(selectedAppId);
      
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl('');
      setConnectionStatus('disconnected');
      
      // Clear status polling
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      
      console.log('✅ Expo server stopped');
    } catch (error) {
      console.error('❌ Failed to stop Expo server:', error);
    }
  }, [selectedAppId]);

  // Poll Expo Status
  const startStatusPolling = useCallback(() => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    statusCheckInterval.current = setInterval(async () => {
      if (!selectedAppId) return;

      try {
        const ipcClient = IpcClient.getInstance();
        // Try dual status first, fallback to original
        let status;
        try {
          status = await ipcClient.getDualExpoStatus(selectedAppId);
        } catch (error) {
          console.warn("Dual Expo status not available, falling back to original:", error);
          status = await ipcClient.getExpoStatus(selectedAppId);
        }
        
        console.log('📊 Expo status update:', status);
        console.log('🌐 Web URL from status:', status.webUrl);
        console.log('📱 QR URL from status:', status.qrUrl || status.lanUrl || status.tunnelUrl);
        setExpoStatus(status);

        if (status.isRunning) {
          setConnectionStatus('connected');
          setIsLoading(false);
          setError('');
          retryCount.current = 0;

          // Generate QR code if we have a URL
          const qrUrl = status.tunnelUrl || status.lanUrl || status.qrUrl;
          if (qrUrl && qrUrl !== qrCodeDataUrl) {
            await generateQRCode(qrUrl);
          }

          // Load web preview - use detected URL or fallback to common ports
          let webUrl = status.webUrl;
          
          // Fallback: if no webUrl detected but server is running, try the actual web bundle
          if (!webUrl && status.isRunning) {
            // Try the actual Expo web bundle URLs that serve the app content
            const possibleUrls = [
              'http://localhost:8081/index.bundle?platform=web',
              'http://localhost:8081/?platform=web',
              'http://localhost:8081/index.html',
              'http://localhost:8081'
            ];
            
            // Use the first one that should work for Expo web
            webUrl = possibleUrls[0];
            console.log('🔄 Using Expo web bundle URL:', webUrl);
          }
          
          if (webUrl && iframeRef.current) {
            const currentSrc = iframeRef.current.src;
            if (currentSrc !== webUrl) {
              console.log('🌐 Loading web preview:', webUrl);
              iframeRef.current.src = webUrl;
              
              // Update the status to include the web URL for future reference
              setExpoStatus(prev => ({ ...prev, webUrl }));
            }
          }
        } else if (retryCount.current < maxRetries) {
          // Retry if server isn't running yet
          retryCount.current++;
          console.log(`⏳ Expo server not ready yet, retry ${retryCount.current}/${maxRetries}`);
        } else {
          // Max retries reached
          setConnectionStatus('disconnected');
          setIsLoading(false);
          setError('Expo server failed to start after multiple attempts');
        }
      } catch (error) {
        console.error('❌ Failed to get Expo status:', error);
        if (retryCount.current >= maxRetries) {
          setConnectionStatus('disconnected');
          setIsLoading(false);
          setError('Failed to connect to Expo server');
        }
      }
    }, 2000); // Poll every 2 seconds
  }, [selectedAppId, generateQRCode, qrCodeDataUrl]);

  // Refresh Preview
  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    console.log('✅ Web preview loaded successfully');
    setError(''); // Clear any previous errors
  }, []);

  const handleIframeError = useCallback(() => {
    console.error('❌ Web preview failed to load');
    setError('Web preview failed to load');
    
    // Try to reload after a delay
    setTimeout(() => {
      if (iframeRef.current && expoStatus.webUrl) {
        console.log('🔄 Retrying iframe load...');
        iframeRef.current.src = expoStatus.webUrl;
      }
    }, 3000);
  }, [expoStatus.webUrl]);

  // Auto-start when app is selected
  useEffect(() => {
    if (selectedAppId) {
      startExpoServer();
    } else {
      // Clean up when no app selected
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl('');
      setConnectionStatus('disconnected');
    }

    // Cleanup on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [selectedAppId, startExpoServer]);

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  if (!selectedAppId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Smartphone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No App Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select an Expo app to start the preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left Side - Mobile Preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Device Frame */}
        <div className="relative">
          {/* Phone Frame */}
          <div 
            className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl"
            style={{
              width: currentDevice.width * currentDevice.scale + 16,
              height: currentDevice.height * currentDevice.scale + 16
            }}
          >
            {/* Screen */}
            <div 
              className="relative bg-white rounded-[2rem] overflow-hidden"
              style={{
                width: currentDevice.width * currentDevice.scale,
                height: currentDevice.height * currentDevice.scale
              }}
            >
              {/* Status Bar */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-black rounded-t-[2rem] flex items-center justify-between px-6 text-white text-xs z-10">
                <span>9:41</span>
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                  <div className="w-6 h-3 border border-white rounded-sm">
                    <div className="w-4 h-2 bg-white rounded-sm m-0.5"></div>
                  </div>
                </div>
              </div>

              {/* App Content */}
              <div className="absolute inset-0 pt-8">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-sm text-gray-600">Starting Expo server...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-4">
                      <div className="text-red-500 mb-2">⚠️</div>
                      <p className="text-xs text-red-600 mb-4">{error}</p>
                      <Button size="sm" onClick={startExpoServer}>
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : expoStatus.webUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={expoStatus.webUrl}
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    title="Expo Web Preview"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Smartphone className="mx-auto h-8 w-8 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600">Waiting for Expo server...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Device Label */}
          <div className="text-center mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentDevice.name}
            </p>
            <div className="flex items-center justify-center mt-2 space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <span className="text-xs text-gray-500">{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 mt-6">
          <Button
            size="sm"
            variant="outline"
            onClick={refreshPreview}
            disabled={!expoStatus.isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (iframeRef.current) {
                const fallbackUrl = 'http://localhost:8081';
                console.log('🔄 Manually loading preview:', fallbackUrl);
                iframeRef.current.src = fallbackUrl;
                setExpoStatus(prev => ({ ...prev, webUrl: fallbackUrl }));
              }
            }}
            disabled={!expoStatus.isRunning}
          >
            Load Preview
          </Button>
          
          {expoStatus.isRunning ? (
            <Button size="sm" variant="destructive" onClick={stopExpoServer}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={startExpoServer} disabled={isLoading}>
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Right Side - QR Code & Instructions */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Test on your phone
          </h3>
        </div>

        {/* QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {qrCodeDataUrl ? (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code for Expo Go" 
                  className="w-48 h-48"
                />
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium">Scan QR code to test</p>
                <div className="space-y-1">
                  <p>1. Open Camera app</p>
                  <p>2. Scan the QR code above</p>
                </div>
              </div>

              {/* Connection Status */}
              <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  {connectionStatus === 'connected' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {connectionStatus === 'connected' 
                      ? 'Browser preview lacks native functions & looks different. Test on device for the best results.'
                      : 'Connecting to development server...'
                    }
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                {isLoading ? (
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <div className="text-gray-400">
                    <Smartphone className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">QR code will appear here</p>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-500">
                {isLoading ? 'Generating QR code...' : 'Start the development server to get QR code'}
              </p>
            </div>
          )}
        </div>

        {/* Build Status */}
        {expoStatus.buildStatus && expoStatus.buildStatus !== 'idle' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {expoStatus.buildProgress || 'Building...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
