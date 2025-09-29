import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Globe,
  MousePointerClick
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode from 'qrcode';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { isStreamingAtom, createAppStreamingAtom } from '@/atoms/chatAtoms';
import { useCheckProblems } from '@/hooks/useCheckProblems';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  lanUrl?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_PRESETS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE', scale: 0.9 },
  tablet: { width: 768, height: 1024, name: 'iPad', scale: 0.6 },
  desktop: { width: 1200, height: 800, name: 'Desktop', scale: 0.5 }
};

export const RealEmbeddedPreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  // 🚨 CRITICAL FIX: Use app-specific streaming state instead of global
  const appStreamingAtom = createAppStreamingAtom(selectedAppId);
  const isStreaming = useAtomValue(appStreamingAtom);
  const { checkProblems } = useCheckProblems(selectedAppId);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [autoStartState, setAutoStartState] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [elementSelectorEnabled, setElementSelectorEnabled] = useState(false);

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
      console.log('✅ QR code generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
      setQrCodeDataUrl('');
    }
  }, []);

  // Get the best available URL for preview
  const getBestPreviewUrl = useCallback((status: ExpoStatus): string | null => {
    console.log('🔍 Finding best preview URL from status:', status);
    
    // NEW PRIORITY: tunnelUrl (always works) > lanUrl > webUrl (localhost often fails)
    if (status.tunnelUrl && status.tunnelUrl.includes('http')) {
      console.log('✅ Using tunnelUrl (most reliable):', status.tunnelUrl);
      return status.tunnelUrl;
    }
    
    if (status.lanUrl) {
      // Convert exp:// to http:// for web preview
      const httpUrl = status.lanUrl.replace('exp://', 'http://');
      console.log('✅ Using converted lanUrl:', httpUrl);
      return httpUrl;
    }
    
    if (status.webUrl && status.webUrl.includes('localhost')) {
      console.log('⚠️ Using webUrl (localhost - may fail):', status.webUrl);
      return status.webUrl;
    }
    
    console.log('❌ No suitable preview URL found');
    return null;
  }, []);

  // Auto-start Expo when app is selected (only if not streaming and no problems)
  const autoStartExpo = useCallback(async () => {
    if (!selectedAppId || autoStartState === 'starting') return;

    // If LLM is still generating, don't start yet
    if (isStreaming) {
      setStatusMessage('⏳ Waiting for generation to finish…');
      return;
    }

    // If Problems tab has issues, skip auto-start
    try {
      const problems = await checkProblems();
      if (problems && problems.length > 0) {
        setStatusMessage('⚠️ Fix problems before starting Expo');
        return;
      }
    } catch {}

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
      console.log('🔍 Available URLs:', {
        webUrl: result.webUrl,
        tunnelUrl: result.tunnelUrl,
        lanUrl: result.lanUrl,
        qrUrl: result.qrUrl
      });
      console.log('🎯 Expo isRunning status:', result.isRunning);
      console.log('🔍 Full result object:', JSON.stringify(result, null, 2));
      
      if (result.isRunning) {
        setExpoStatus(result);
        setAutoStartState('ready');
        setStatusMessage('✅ Expo server ready!');
        
        // Generate QR code for mobile testing - prioritize tunnel URL
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          console.log('🎯 Generating QR code for mobile access:', qrUrl);
          await generateQRCode(qrUrl);
          setShowQrPanel(true);
        } else {
          console.log('⚠️ No QR URL available yet, will retry when tunnel is ready');
        }
        
        console.log('✅ Auto-start completed successfully');
      } else {
        // Check if we have URLs even if isRunning is false
        const hasAnyUrl = result.webUrl || result.tunnelUrl || result.lanUrl || result.qrUrl;
        if (hasAnyUrl) {
          console.log('⚠️ Expo says not running but we have URLs - proceeding anyway');
          setExpoStatus(result);
          setAutoStartState('ready');
          setStatusMessage('⚠️ Expo server detected (partial)');
          
          // Generate QR code if available
          const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
          if (qrUrl) {
            console.log('🎯 Generating QR code despite isRunning=false:', qrUrl);
            await generateQRCode(qrUrl);
            setShowQrPanel(true);
          }
        } else {
          throw new Error(`Expo failed to start - isRunning: ${result.isRunning}, URLs: ${JSON.stringify({webUrl: result.webUrl, tunnelUrl: result.tunnelUrl, lanUrl: result.lanUrl})}`);
        }
      }
    } catch (error) {
      console.error('❌ Auto-start failed:', error);
      setAutoStartState('error');
      setStatusMessage(`❌ Failed to start: ${error.message}`);
    }
  }, [selectedAppId, autoStartState, generateQRCode]);

  // Auto-start when app is selected and generation is idle (debounced)
  useEffect(() => {
    if (!selectedAppId) return;
    if (autoStartState !== 'idle') return;
    const t = setTimeout(() => {
      autoStartExpo();
    }, 800);
    return () => clearTimeout(t);
  }, [selectedAppId, isStreaming, autoStartState, autoStartExpo]);

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
        } else {
          // Check if we now have a tunnel URL and need to generate QR code
          const qrUrl = status.tunnelUrl || status.qrUrl || status.lanUrl;
          if (qrUrl && !qrCodeDataUrl) {
            console.log('🎯 Tunnel URL now available, generating QR code:', qrUrl);
            await generateQRCode(qrUrl);
            setShowQrPanel(true);
          }
        }
      } catch (error) {
        console.error('Failed to poll Expo status:', error);
      }
    };

    const interval = setInterval(pollExpoStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedAppId, autoStartState, qrCodeDataUrl, generateQRCode]);

  // Stop Expo automatically while streaming to avoid wasted work
  useEffect(() => {
    const maybeStop = async () => {
      if (!selectedAppId) return;
      if (isStreaming && (autoStartState === 'ready' || autoStartState === 'starting')) {
        try {
          await IpcClient.getInstance().expoStop(selectedAppId);
          setAutoStartState('idle');
          setStatusMessage('⏹️ Paused Expo while code is generating');
        } catch {}
      }
    };
    maybeStop();
  }, [isStreaming, selectedAppId, autoStartState]);

  // Refresh iframe
  const refreshPreview = () => {
    setIframeKey(prev => prev + 1);
    console.log('🔄 Refreshing preview iframe');
  };

  // Toggle element selector
  const toggleElementSelector = () => {
    setElementSelectorEnabled(!elementSelectorEnabled);
    console.log('🎯 Element selector:', !elementSelectorEnabled ? 'enabled' : 'disabled');
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
      {/* Controls Header */}
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
              Live
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
          {/* Element Selector Toggle */}
          {autoStartState === 'ready' && (
            <Button
              variant={elementSelectorEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleElementSelector}
              className={elementSelectorEnabled ? 'bg-purple-500 hover:bg-purple-600' : ''}
            >
              <MousePointerClick className="h-4 w-4" />
            </Button>
          )}
          
          {/* Refresh Button */}
          {autoStartState === 'ready' && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPreview}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          
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
          </div>
          
          {/* Open in Browser */}
          {autoStartState === 'ready' && (
            <Button variant="outline" size="sm" onClick={openInBrowser}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {autoStartState === 'starting' && (
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-blue-500" />
            <h3 className="text-lg font-medium">Auto-Starting Expo...</h3>
            <p className="text-sm text-gray-600">{statusMessage}</p>
            <div className="text-xs text-gray-500">
              ⚡ No manual buttons needed - everything happens automatically!
            </div>
          </div>
        )}

        {autoStartState === 'ready' && previewUrl && (
          <div className="relative">
            {/* Device Frame with REAL PREVIEW */}
            <div
              className="mx-auto bg-black rounded-3xl p-3 shadow-2xl relative"
              style={{
                width: currentDevice.width * currentDevice.scale + 24,
                height: currentDevice.height * currentDevice.scale + 24
              }}
            >
              {/* Mobile notch simulation */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-black rounded-b-lg z-20"></div>
              
              {/* REAL IFRAME PREVIEW */}
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full rounded-2xl bg-white"
                style={{
                  width: currentDevice.width * currentDevice.scale,
                  height: currentDevice.height * currentDevice.scale,
                  border: 'none',
                  borderRadius: '16px'
                }}
                title="Expo App Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                onLoad={() => console.log('✅ Preview iframe loaded successfully for URL:', previewUrl)}
                onError={(e) => {
                  console.error('❌ Preview iframe failed to load URL:', previewUrl);
                  console.error('❌ Iframe error details:', e);
                }}
              />
              
              {/* Element Selector Overlay */}
              {elementSelectorEnabled && (
                <div className="absolute inset-3 rounded-2xl border-2 border-purple-500 border-dashed bg-purple-500/10 flex items-center justify-center z-10 pointer-events-none">
                  <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Element Selector Active
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-green-500 text-white shadow-lg">
                <Zap className="w-3 h-3 mr-1" />
                Live Preview
              </Badge>
            </div>
          </div>
        )}

        {autoStartState === 'error' && (
          <div className="text-center space-y-4">
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
          <div className="text-center space-y-4">
            <Smartphone className="h-16 w-16 mx-auto opacity-30" />
            <h3 className="text-lg font-medium">Select an App</h3>
            <p className="text-sm text-gray-600">
              Choose an app from the sidebar to auto-start the preview
            </p>
          </div>
        )}
      </div>

      {/* QR Code Panel */}
      {showQrPanel && qrCodeDataUrl && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-4 z-30">
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
