import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import QRCode from 'qrcode';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  lanUrl?: string;
  qrUrl?: string;
  terminalOutput?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1200, height: 800, name: 'Desktop' }
};

export const RorkDevicePreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Simulate loading progress like RORK (define before effects to avoid TDZ)
  const simulateLoading = useCallback(() => {
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPreviewLoading(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  }, []);

  // Parse Expo URLs and generate QR code (define before effects to avoid TDZ)
  const parseExpoUrls = useCallback(async (output: string) => {
    // Extract tunnel URL (priority for QR code)
    const tunnelMatch = output.match(/https?:\/\/[a-zA-Z0-9-]+\.(exp\.direct|tunnels\.expo\.(dev|io))/);
    const lanMatch = output.match(/exp:\/\/[\d.]+:\d+/);
    const webMatch = output.match(/https?:\/\/localhost:\d+/);

    const qrUrl = tunnelMatch?.[0] || lanMatch?.[0] || webMatch?.[0];

    if (qrUrl && qrUrl !== expoStatus.qrUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }
  }, [expoStatus.qrUrl]);

  // Poll Expo status
  useEffect(() => {
    if (!selectedAppId) return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
        setExpoStatus(status);

        // Update preview URL if Expo is running
        if (status.isRunning && status.webUrl && status.webUrl !== previewUrl) {
          setPreviewUrl(status.webUrl);
          setIsPreviewLoading(true);
          simulateLoading();
        }

        // Generate QR code if we have tunnel/LAN URL
        if (status.terminalOutput) {
          parseExpoUrls(status.terminalOutput);
        }
      } catch (error) {
        console.error('Failed to get Expo status:', error);
      }
    };

    // Initial poll
    pollExpoStatus();

    // Poll every 2 seconds
    const interval = setInterval(pollExpoStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId, previewUrl, simulateLoading, parseExpoUrls]);

  // Live-link Device Preview to the real per-app terminal output
  useEffect(() => {
    if (!selectedAppId) return;
    // Ensure we're in Electron context
    if (typeof window === 'undefined' || !('electron' in window)) return;

    const handler = (
      _event: any,
      data: {
        appId: number;
        type: 'command' | 'stdout' | 'stderr' | 'system';
        content: string;
        timestamp: string;
      },
    ) => {
      if (!data || data.appId !== selectedAppId) return;
      if (data.type !== 'stdout' || typeof data.content !== 'string') return;

      // Update preview URL when Metro prints it
      const webMatch = data.content.match(/https?:\/\/localhost:\d+/);
      if (webMatch) {
        const nextUrl = webMatch[0];
        if (nextUrl && nextUrl !== previewUrl) {
          setPreviewUrl(nextUrl);
          setIsPreviewLoading(true);
          simulateLoading();
        }
      }

      // Feed terminal lines to QR/url parser (handles tunnel/lan)
      parseExpoUrls(data.content);
    };

    // @ts-ignore - preload enforces channel allowlist
    window.electron.ipcRenderer.on('terminal:output', handler);
    return () => {
      // @ts-ignore
      window.electron.ipcRenderer.removeListener('terminal:output', handler);
    };
  }, [selectedAppId, previewUrl, parseExpoUrls, simulateLoading]);

  // Open URL in browser
  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // Get device dimensions
  const deviceSize = DEVICE_SIZES[deviceType];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Preview Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Device Preview
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant={deviceType === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceType('mobile')}
              className="h-8 w-8 p-0"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceType === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceType('tablet')}
              className="h-8 w-8 p-0"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceType === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceType('desktop')}
              className="h-8 w-8 p-0"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            {previewUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPreviewLoading(true);
                  simulateLoading();
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src;
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {expoStatus.webUrl && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{expoStatus.webUrl}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openUrl(expoStatus.webUrl!)}
              className="h-6 w-6 p-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Device Preview - Left Side */}
        <div className="flex-1 p-6 flex items-center justify-center">
          {previewUrl ? (
            <div className="relative">
              {/* Device Frame */}
              <div 
                className="relative bg-black rounded-3xl p-3 shadow-2xl"
                style={{
                  width: Math.min(deviceSize.width * 0.9, 350),
                  height: Math.min(deviceSize.height * 0.9, 600)
                }}
              >
                {/* Screen */}
                <div className="w-full h-full bg-white rounded-2xl overflow-hidden relative">
                  {isPreviewLoading ? (
                    <div className="flex items-center justify-center h-full bg-black text-white">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3"></div>
                        <div className="text-sm">Loading ({Math.round(loadingProgress)}%)</div>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      className="w-full h-full border-none"
                      title="App Preview"
                      onLoad={() => setIsPreviewLoading(false)}
                      onError={() => setIsPreviewLoading(false)}
                    />
                  )}
                </div>
              </div>
              
              {/* Device Label */}
              <div className="text-center mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                {deviceSize.name}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Preview Available</h3>
              <p className="text-sm">Start your Expo server to see the preview</p>
              <p className="text-xs mt-1 text-gray-400">Use the System Messages terminal to run: npm expo start --web --tunnel</p>
            </div>
          )}
        </div>

        {/* QR Code Panel - Right Side */}
        {qrCodeDataUrl && (
          <div className="w-80 p-6 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test on your phone
            </h4>
            
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                </div>
              </div>
              
              {/* Instructions */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Scan QR code to test
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <div>To test on your device:</div>
                  <div className="pl-3 space-y-1">
                    <div>1. Open Camera app</div>
                    <div>2. Scan the QR code above</div>
                  </div>
                </div>
                
                {/* Warning */}
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="text-yellow-600 dark:text-yellow-400 text-xs font-medium mt-0.5">⚠️</div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">
                      <div className="font-medium mb-1">Browser preview lacks native functions & looks different.</div>
                      <button 
                        onClick={() => expoStatus.webUrl && openUrl(expoStatus.webUrl)}
                        className="underline hover:no-underline font-medium"
                      >
                        Test on device
                      </button>
                      {' '}for the best results.
                    </div>
                  </div>
                </div>

                {/* URLs */}
                {(expoStatus.tunnelUrl || expoStatus.lanUrl) && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Available URLs
                    </div>
                    {expoStatus.tunnelUrl && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Tunnel:</span>
                        <button
                          onClick={() => openUrl(expoStatus.tunnelUrl!)}
                          className="text-purple-600 dark:text-purple-400 hover:underline flex-1 text-left truncate"
                        >
                          {expoStatus.tunnelUrl}
                        </button>
                      </div>
                    )}
                    {expoStatus.lanUrl && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">LAN:</span>
                        <span className="text-green-600 dark:text-green-400 flex-1 truncate">
                          {expoStatus.lanUrl}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
