import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  ExternalLink, 
  QrCode as QrCodeIcon, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Globe
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode from 'qrcode';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  lanUrl?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_PRESETS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE', scale: 1 },
  tablet: { width: 768, height: 1024, name: 'iPad', scale: 0.8 },
  desktop: { width: 1200, height: 800, name: 'Desktop', scale: 0.7 }
};

export const AutoStartPreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [autoStartState, setAutoStartState] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const currentDevice = DEVICE_PRESETS[deviceType];

  // Generate QR code for mobile testing
  const generateQRCode = useCallback(async (url: string) => {
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
      setShowQrPanel(true);
      console.log('✅ QR code generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      setQrCodeDataUrl('');
    }
  }, []);

  // Get the best available URL for preview
  const getBestPreviewUrl = useCallback((status: ExpoStatus): string | null => {
    console.log('🔍 Finding best preview URL from status:', status);
    
    // Priority order: webUrl (localhost) > lanUrl > tunnelUrl
    if (status.webUrl && status.webUrl.includes('localhost')) {
      console.log('✅ Using webUrl (localhost):', status.webUrl);
      return status.webUrl;
    }
    
    if (status.lanUrl) {
      // Convert exp:// to http:// for web preview
      const httpUrl = status.lanUrl.replace('exp://', 'http://');
      console.log('✅ Using converted lanUrl:', httpUrl);
      return httpUrl;
    }
    
    if (status.tunnelUrl) {
      console.log('✅ Using tunnelUrl:', status.tunnelUrl);
      return status.tunnelUrl;
    }
    
    console.log('❌ No suitable preview URL found');
    return null;
  }, []);

  // Auto-start Expo when app is selected
  const autoStartExpo = useCallback(async () => {
    if (!selectedAppId || autoStartState === 'starting') return;

    try {
      setAutoStartState('starting');
      setStatusMessage('🚀 Auto-starting Expo server...');
      console.log('🚀 Auto-starting Expo for app:', selectedAppId);
      
      const ipcClient = IpcClient.getInstance();
      
      // Start with web mode for instant localhost preview + tunnel for mobile
      const result = await ipcClient.expoStart({ 
        appId: selectedAppId, 
        useTunnel: true, // Enable tunnel for mobile QR code
        native: false, // Web mode ensures localhost:8081 is available
      });
      
      console.log('📊 Expo start result:', result);
      
      if (result.isRunning) {
        setExpoStatus(result);
        setAutoStartState('ready');
        setStatusMessage('✅ Expo server ready!');
        
        // Generate QR code for mobile testing
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          await generateQRCode(qrUrl);
        }
        
        console.log('✅ Auto-start completed successfully');
      } else {
        throw new Error('Expo failed to start');
      }
    } catch (error) {
      console.error('❌ Auto-start failed:', error);
      setAutoStartState('error');
      setStatusMessage(`❌ Failed to start: ${error.message}`);
    }
  }, [selectedAppId, autoStartState, generateQRCode]);

  // Check if app has actual content (not just scaffold)
  const checkAppHasContent = useCallback(async (appId: number): Promise<boolean> => {
    try {
      const ipcClient = IpcClient.getInstance();
      const app = await ipcClient.getApp(appId);
      if (!app) return false;
      
      // Check if app has more than just the basic scaffold files
      // For Expo apps, look for signs that LLM has generated content
      const appPath = `C:\\Users\\rahul\\applaa-apps\\${app.path}`;
      
      // Simple check: if App.tsx exists and has more than basic scaffold content
      try {
        const fs = require('fs');
        const appTsxPath = `${appPath}\\App.tsx`;
        if (fs.existsSync(appTsxPath)) {
          const content = fs.readFileSync(appTsxPath, 'utf8');
          // If it's still the basic "Open up App.tsx" message, it's not ready
          return !content.includes('Open up App.tsx to start working');
        }
      } catch (error) {
        console.log('Could not check app content:', error);
      }
      
      return false; // Default to not ready if we can't determine
    } catch (error) {
      console.error('Failed to check app content:', error);
      return false;
    }
  }, []);

  // Auto-start when app is selected AND has content
  useEffect(() => {
    if (selectedAppId && autoStartState === 'idle') {
      console.log('🎯 App selected, checking if ready for auto-start:', selectedAppId);
      
      checkAppHasContent(selectedAppId).then(hasContent => {
        if (hasContent) {
          console.log('✅ App has content, triggering auto-start');
          autoStartExpo();
        } else {
          console.log('⏳ App is still being generated, waiting...');
          // Check again in 3 seconds
          setTimeout(() => {
            if (selectedAppId && autoStartState === 'idle') {
              checkAppHasContent(selectedAppId).then(hasContent => {
                if (hasContent) {
                  console.log('✅ App ready after wait, starting Expo');
                  autoStartExpo();
                }
              });
            }
          }, 3000);
        }
      });
    }
  }, [selectedAppId, autoStartState, autoStartExpo, checkAppHasContent]);

  // Poll Expo status for updates
  useEffect(() => {
    if (!selectedAppId || autoStartState !== 'ready') return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.expoStatus();
        setExpoStatus(status);
        
        if (!status.isRunning) {
          setAutoStartState('error');
          setStatusMessage('❌ Expo server stopped unexpectedly');
        }
      } catch (error) {
        console.error('Failed to poll Expo status:', error);
      }
    };

    const interval = setInterval(pollExpoStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedAppId, autoStartState]);

  // Open preview in optimized window
  const openPreviewWindow = () => {
    const previewUrl = getBestPreviewUrl(expoStatus);
    if (!previewUrl) {
      console.error('❌ No preview URL available');
      return;
    }

    console.log('🪟 Opening preview window with URL:', previewUrl);
    
    const previewWindow = window.open(
      previewUrl,
      'expo-preview',
      `width=${currentDevice.width + 50},height=${currentDevice.height + 100},resizable=yes,scrollbars=yes,location=yes`
    );
    
    if (previewWindow) {
      previewWindow.focus();
      console.log('✅ Preview window opened successfully');
    } else {
      console.error('❌ Failed to open preview window (popup blocked?)');
    }
  };

  // Open in browser tab
  const openInBrowser = () => {
    const previewUrl = getBestPreviewUrl(expoStatus);
    if (previewUrl) {
      window.open(previewUrl, '_blank');
      console.log('🌐 Opened in browser:', previewUrl);
    }
  };

  // Restart Expo server
  const restartExpo = async () => {
    try {
      setAutoStartState('starting');
      setStatusMessage('🔄 Restarting Expo server...');
      
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      
      // Wait a moment before restarting
      setTimeout(() => {
        autoStartExpo();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to restart Expo:', error);
      setAutoStartState('error');
      setStatusMessage(`❌ Restart failed: ${error.message}`);
    }
  };

  const previewUrl = getBestPreviewUrl(expoStatus);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Auto-Status Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-medium">
            {currentDevice.name}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {currentDevice.width}×{currentDevice.height}
          </Badge>
          
          {/* Auto-Start Status */}
          {autoStartState === 'starting' && (
            <Badge className="text-xs bg-blue-500 hover:bg-blue-600">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Starting...
            </Badge>
          )}
          {autoStartState === 'ready' && (
            <Badge className="text-xs bg-green-500 hover:bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          )}
          {autoStartState === 'error' && (
            <Badge className="text-xs bg-red-500 hover:bg-red-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* QR Code Toggle */}
          {qrCodeDataUrl && (
            <Button
              variant={showQrPanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowQrPanel(!showQrPanel)}
            >
              <QrCodeIcon className="h-4 w-4" />
            </Button>
          )}
          
          {/* Restart Button */}
          {autoStartState === 'error' && (
            <Button
              variant="outline"
              size="sm"
              onClick={restartExpo}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
          
          {/* Device Presets */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={deviceType === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeviceType('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Mobile (375×667)</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={deviceType === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeviceType('tablet')}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Tablet (768×1024)</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={deviceType === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeviceType('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Desktop (1200×800)</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {autoStartState === 'starting' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-blue-500" />
              <h3 className="text-lg font-medium">Auto-Starting Expo...</h3>
              <p className="text-sm text-gray-600">{statusMessage}</p>
              <div className="text-xs text-gray-500">
                ⚡ No manual buttons needed - everything happens automatically!
              </div>
            </div>
          )}

          {autoStartState === 'ready' && previewUrl && (
            <div className="space-y-6">
              {/* Device Frame Mockup */}
              <div
                className="mx-auto bg-black rounded-3xl p-3 shadow-2xl"
                style={{
                  width: currentDevice.width * currentDevice.scale + 24,
                  height: currentDevice.height * currentDevice.scale + 24
                }}
              >
                <div
                  className="bg-white rounded-2xl overflow-hidden relative"
                  style={{
                    width: currentDevice.width * currentDevice.scale,
                    height: currentDevice.height * currentDevice.scale
                  }}
                >
                  {/* Mobile notch simulation */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-black rounded-b-lg z-10"></div>
                  
                  {/* Preview ready indicator */}
                  <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <h3 className="font-semibold text-gray-800 mb-2">Preview Ready!</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Auto-started successfully<br />
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {previewUrl.length > 30 ? previewUrl.substring(0, 30) + '...' : previewUrl}
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button onClick={openPreviewWindow} className="bg-blue-500 hover:bg-blue-600">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Preview
                </Button>
                
                <Button variant="outline" onClick={openInBrowser}>
                  <Globe className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
              </div>
              
              <p className="text-sm text-green-600">
                ✅ <strong>Auto-started!</strong> No manual buttons needed.
              </p>
            </div>
          )}

          {autoStartState === 'error' && (
            <div className="space-y-4">
              <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
              <h3 className="text-lg font-medium text-red-600">Auto-Start Failed</h3>
              <p className="text-sm text-gray-600">{statusMessage}</p>
              <Button onClick={restartExpo} className="bg-orange-500 hover:bg-orange-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {autoStartState === 'idle' && !selectedAppId && (
            <div className="space-y-4">
              <Smartphone className="h-16 w-16 mx-auto opacity-30" />
              <h3 className="text-lg font-medium">Select an App</h3>
              <p className="text-sm text-gray-600">
                Choose an app from the sidebar to auto-start the preview
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Panel */}
      {showQrPanel && qrCodeDataUrl && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-4 z-10">
          <div className="text-center">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Scan with Expo Go</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQrPanel(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <img
              src={qrCodeDataUrl}
              alt="QR Code for mobile testing"
              className="w-32 h-32 mx-auto mb-2"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {expoStatus.tunnelUrl ? 'Tunnel URL' : 'Local URL'}
            </p>
            {expoStatus.tunnelUrl && (
              <Badge variant="secondary" className="text-xs mt-1">
                Public Access
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
