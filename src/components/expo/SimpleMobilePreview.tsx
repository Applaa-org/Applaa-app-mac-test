import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Tablet, ExternalLink, RefreshCw, QrCode as QrCodeIcon, Search, RotateCcw } from "lucide-react";
import QRCode from "qrcode";
import { IpcClient } from "@/ipc/ipc_client";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom, appOutputAtom } from "@/atoms/appAtoms";
import { AutoErrorFixBanner } from "../preview_panel/AutoErrorFixBanner";
import { useAutoErrorFix } from "@/hooks/useAutoErrorFix";
import { 
  DEVICE_PRESETS, 
  DEVICE_CATEGORIES, 
  getDevicesByCategory, 
  getDevicePreset, 
  getPopularDevices,
  type DevicePreset 
} from "@/lib/devicePresets";

// Use the ExpoStatus type from IPC client
type ExpoStatus = Awaited<ReturnType<IpcClient['expoStatus']>>;

export function SimpleMobilePreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appOutput = useAtomValue(appOutputAtom);
  const { detectConsoleErrors } = useAutoErrorFix({ enabled: true });
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [selectedDevice, setSelectedDevice] = useState<string>('iphone-15-pro'); // Default to iPhone 15 Pro
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [zoom, setZoom] = useState<number>(75);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to preview your app");
  const [iframeKey, setIframeKey] = useState<number>(0); // Force iframe refresh
  const [lastHotReloadTime, setLastHotReloadTime] = useState<number>(0);
  const [iframeRetryCount, setIframeRetryCount] = useState<number>(0);
  const autoStartedForAppId = useRef<number | null>(null);
  const iframeRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tunnel toggle - default to LAN for reliability
  const [useTunnel, setUseTunnel] = useState<boolean>(false);

  // Monitor console errors for auto-fix (especially Expo-specific errors)
  useEffect(() => {
    if (appOutput && appOutput.length > 0) {
      console.log('🔍 Monitoring Expo console output for auto-fix:', appOutput.length, 'messages');
      detectConsoleErrors(appOutput);
    }
  }, [appOutput, detectConsoleErrors]);

  // Get current device preset
  const currentDevice = getDevicePreset(selectedDevice) || DEVICE_PRESETS['iphone-15-pro'];

  // Simple QR generation
  const generateQRCode = useCallback(async (url: string) => {
    if (!url) {
      console.log('🔍 QR generation skipped - no URL provided');
      return;
    }
    try {
      console.log('🔍 Generating QR code for URL:', url);
      // Convert to exp:// for mobile app opening
      const qrUrl = url.startsWith('http://') ? url.replace(/^http:\/\//, 'exp://') : url;
      console.log('🔍 QR URL after conversion:', qrUrl);
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256, // Increased size for better scanning
        margin: 3,  // Slightly more margin
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M' // Medium error correction for better scanning
      });
      setQrCodeDataUrl(qrDataUrl);
      console.log('✅ QR code generated successfully');
    } catch (error) {
      console.error('❌ QR generation failed:', error);
      setQrCodeDataUrl("");
    }
  }, []);

  // Check server status with hot reload detection
  const checkExpoStatus = useCallback(async () => {
    try {
      const status = await IpcClient.getInstance().expoStatus();
      console.log('Expo status received:', status); // Debug log
      
      // Detect hot reload events
      if (status.lastHotReload && status.lastHotReload > lastHotReloadTime) {
        console.log('🔥 Hot reload detected! Refreshing preview...');
        setLastHotReloadTime(status.lastHotReload);
        setIframeKey(prev => prev + 1); // Force iframe refresh
        setStatusMessage("🔥 Hot reloaded!");
        
        // Reset status message after 2 seconds
        setTimeout(() => {
          setStatusMessage("App is running!");
        }, 2000);
      }
      
      // Update build status in UI
      if (status.buildStatus) {
        switch (status.buildStatus) {
          case 'building':
            setStatusMessage(status.buildProgress || "🔨 Building...");
            break;
          case 'success':
            setStatusMessage("✅ Build complete!");
            setTimeout(() => setStatusMessage("App is running!"), 1500);
            break;
          case 'error':
            setStatusMessage("❌ Build failed");
            break;
          default:
            if (status.isRunning) {
              setStatusMessage("App is running!");
            }
        }
      }
      
      setExpoStatus(status);
      
      if (status.isRunning) {
        if (!status.buildStatus || status.buildStatus === 'idle') {
          setStatusMessage("App is running!");
        }
        setIsStarting(false);
        
        // Generate QR for mobile testing (prioritize tunnel, fallback to LAN)
        console.log('🔍 URL Status - tunnelUrl:', status.tunnelUrl, 'lanUrl:', status.lanUrl, 'qrUrl:', status.qrUrl);
        const qrUrl = status.tunnelUrl || status.lanUrl || status.qrUrl;
        console.log('🔍 Selected QR URL:', qrUrl);
        if (qrUrl) {
          generateQRCode(qrUrl);
        } else {
          console.log('🔍 No QR URL available - clearing QR code');
          setQrCodeDataUrl("");
        }
        
        // If we have a webUrl, log it for debugging
        if (status.webUrl && status.webUrl !== 'about:blank') {
          console.log('Metro bundler URL ready:', status.webUrl);
        }
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, [generateQRCode, lastHotReloadTime]);

  // Start server (super simple)
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      setIsStarting(true);
      setStatusMessage("Starting your app...");
      
      // Use tunnel toggle - default to LAN for reliability
      const result = await IpcClient.getInstance().expoStart({ 
        appId: selectedAppId, 
        useTunnel: useTunnel,
        // Start in web mode by default so iframe preview works reliably
        native: false
      });
      
      if (result.isRunning) {
        setExpoStatus(result);
        setStatusMessage("App is ready!");
        setIsStarting(false);
        
        const qrUrl = result.tunnelUrl || result.lanUrl || result.qrUrl;
        if (qrUrl) {
          generateQRCode(qrUrl);
        }
      }
    } catch (error) {
      console.error('Failed to start app:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle tunnel-specific failures
      if (useTunnel && (errorMessage.includes('tunnel') || errorMessage.includes('ngrok') || errorMessage.includes('timeout'))) {
        setStatusMessage("⚠️ Tunnel failed - retrying with LAN mode...");
        setUseTunnel(false); // Disable tunnel for retry
        setTimeout(() => {
          console.log('🔄 Retrying Expo start without tunnel...');
          startExpoServer();
        }, 2000);
      } else if (errorMessage.includes('port') || errorMessage.includes('EADDRINUSE')) {
        setStatusMessage("⚠️ Port conflict - retrying with different port...");
        setTimeout(() => {
          console.log('🔄 Retrying Expo start after port conflict...');
          startExpoServer();
        }, 2000);
      } else if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
        setStatusMessage("❌ Expo CLI not found - please install Expo CLI");
        setIsStarting(false);
      } else {
        setStatusMessage("❌ Failed to start - check console for details");
        setIsStarting(false);
      }
    }
  }, [selectedAppId, generateQRCode]);

  // Stop server
  const stopExpoServer = useCallback(async () => {
    try {
      await IpcClient.getInstance().expoStop();
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl("");
      setStatusMessage("Stopped");
      setIsStarting(false);
    } catch (error) {
      console.error('Failed to stop app:', error);
    }
  }, []);

  // Manual refresh preview
  const refreshPreview = useCallback(() => {
    console.log('🔄 Manual preview refresh triggered');
    setIframeKey(prev => prev + 1);
    setIframeRetryCount(0); // Reset retry count on manual refresh
    setStatusMessage("🔄 Refreshing preview...");
    setTimeout(() => {
      setStatusMessage("App is running!");
    }, 1500);
  }, []);

  // Auto-retry iframe loading when it fails
  const retryIframeLoad = useCallback(() => {
    if (iframeRetryCount < 3) { // Max 3 retries
      const nextRetry = iframeRetryCount + 1;
      console.log(`🔄 Auto-retrying iframe load (attempt ${nextRetry}/3)`);
      setIframeRetryCount(nextRetry);
      setStatusMessage(`🔄 Retrying preview load (${nextRetry}/3)...`);
      
      // Clear any existing timeout
      if (iframeRetryTimeoutRef.current) {
        clearTimeout(iframeRetryTimeoutRef.current);
      }
      
      // Retry after a delay
      iframeRetryTimeoutRef.current = setTimeout(() => {
        setIframeKey(prev => prev + 1);
      }, 2000 * nextRetry); // Increasing delay: 2s, 4s, 6s
    } else {
      console.log('❌ Max iframe retry attempts reached');
      setStatusMessage("❌ Failed to load preview - try manual refresh");
    }
  }, [iframeRetryCount]);

  // Auto-start when app is selected
  useEffect(() => {
    if (selectedAppId && autoStartedForAppId.current !== selectedAppId) {
      console.log('🚀 Auto-starting Expo for app:', selectedAppId);
      autoStartedForAppId.current = selectedAppId;
      setStatusMessage("🚀 Auto-starting preview...");
      setIsStarting(true);
      setIframeRetryCount(0); // Reset retry count for new app
      
      // Clear any existing retry timeout
      if (iframeRetryTimeoutRef.current) {
        clearTimeout(iframeRetryTimeoutRef.current);
        iframeRetryTimeoutRef.current = null;
      }
      
      // Start with a small delay to ensure UI updates
      setTimeout(() => {
        startExpoServer();
      }, 500);
    }
  }, [selectedAppId, startExpoServer]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (iframeRetryTimeoutRef.current) {
        clearTimeout(iframeRetryTimeoutRef.current);
      }
    };
  }, []);

  // Poll status while running (more frequently)
  useEffect(() => {
    if (!selectedAppId) return;
    
    // Poll immediately and then every 2 seconds
    checkExpoStatus();
    const interval = setInterval(checkExpoStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId, checkExpoStatus]);

  // Device frame styles based on selected device
  const getDeviceStyle = () => {
    const { dimensions, borderRadius } = currentDevice;
    
    // Handle orientation for mobile devices
    const actualWidth = isLandscape && currentDevice.category !== 'Desktop' 
      ? dimensions.height 
      : dimensions.width;
    const actualHeight = isLandscape && currentDevice.category !== 'Desktop' 
      ? dimensions.width 
      : dimensions.height;
    
    // Scale device to fit in preview area
    const maxWidth = currentDevice.category === 'Desktop' ? 1200 : 500;
    const maxHeight = currentDevice.category === 'Desktop' ? 800 : 900;
    
    const scaleX = actualWidth > maxWidth ? maxWidth / actualWidth : 1;
    const scaleY = actualHeight > maxHeight ? maxHeight / actualHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const scaledWidth = actualWidth * scale;
    const scaledHeight = actualHeight * scale;
    
    return {
      borderRadius,
      padding: currentDevice.category === 'Desktop' ? '8px' : '16px 8px',
      backgroundColor: '#1a1a1a',
      border: '3px solid #333',
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: currentDevice.category === 'Desktop' 
        ? '0 4px 20px rgba(0,0,0,0.3)' 
        : '0 8px 30px rgba(0,0,0,0.4)',
    };
  };

  const webUrl = expoStatus.webUrl || 'about:blank';
  const hasQr = qrCodeDataUrl.length > 0;
  
  // Debug logging
  console.log('Current webUrl for iframe:', webUrl);
  console.log('Expo status:', expoStatus);

  return (
    <div className="flex h-full">
      <AutoErrorFixBanner />
      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Controls */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            {/* Enhanced Device Selector */}
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentDevice.icon}</span>
                    <span className="font-medium">{currentDevice.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {/* Popular Devices */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  ⭐ Popular Devices
                </div>
                {getPopularDevices().map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{device.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{device.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {device.dimensions.width}×{device.dimensions.height}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
                
                {/* Categories */}
                {DEVICE_CATEGORIES.map((category) => {
                  const devices = getDevicesByCategory(category.id as any);
                  if (devices.length === 0) return null;
                  
                  return (
                    <div key={category.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        {category.icon} {category.name}
                      </div>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{device.icon}</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{device.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {device.dimensions.width}×{device.dimensions.height}
                                {device.description && ` • ${device.description}`}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Orientation Toggle (for mobile devices) */}
            {currentDevice.category !== 'Desktop' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLandscape(!isLandscape)}
                title={isLandscape ? 'Switch to Portrait' : 'Switch to Landscape'}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {/* Tunnel Toggle */}
            <Button
              variant={useTunnel ? "default" : "outline"}
              size="sm"
              onClick={() => setUseTunnel(!useTunnel)}
              title={useTunnel ? 'Using Tunnel (global access)' : 'Using LAN (local network only)'}
              disabled={expoStatus.isRunning}
            >
              {useTunnel ? '🌐' : '🏠'}
            </Button>

            {/* Zoom */}
            <Select value={zoom.toString()} onValueChange={(value) => setZoom(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="85">85%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Device Info & Action Buttons */}
          <div className="flex items-center gap-4">
            {/* Device Info & Build Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{statusMessage}</span>
              
              {/* Build Status Indicator */}
              {expoStatus.buildStatus && expoStatus.buildStatus !== 'idle' && (
                <>
                  <span className="text-xs">•</span>
                  <span className={`text-xs font-medium ${
                    expoStatus.buildStatus === 'building' ? 'text-yellow-600' :
                    expoStatus.buildStatus === 'success' ? 'text-green-600' :
                    expoStatus.buildStatus === 'error' ? 'text-red-600' : ''
                  }`}>
                    {expoStatus.buildStatus === 'building' && '🔨'}
                    {expoStatus.buildStatus === 'success' && '✅'}
                    {expoStatus.buildStatus === 'error' && '❌'}
                    {expoStatus.buildProgress || expoStatus.buildStatus}
                  </span>
                </>
              )}
              
              <span className="text-xs">•</span>
              <span className="font-medium">
                {isLandscape && currentDevice.category !== 'Desktop' 
                  ? `${currentDevice.dimensions.height}×${currentDevice.dimensions.width}`
                  : `${currentDevice.dimensions.width}×${currentDevice.dimensions.height}`
                }
              </span>
              {currentDevice.pixelRatio > 1 && (
                <span className="text-xs">@{currentDevice.pixelRatio}x</span>
              )}
              {isLandscape && currentDevice.category !== 'Desktop' && (
                <span className="text-xs font-medium text-blue-600">Landscape</span>
              )}
            </div>
            
            {expoStatus.isRunning ? (
              <>
                <Button variant="outline" size="sm" onClick={startExpoServer} disabled={isStarting} title="Restart Expo Server">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={refreshPreview} title="Refresh Preview">
                  🔄
                </Button>
                <Button variant="outline" size="sm" onClick={stopExpoServer}>
                  Stop
                </Button>
                {expoStatus.webUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(expoStatus.webUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={startExpoServer} disabled={isStarting || !selectedAppId}>
                {isStarting ? "🚀 Starting..." : selectedAppId ? "🔄 Restart Preview" : "Select an App"}
              </Button>
            )}
          </div>
        </div>

        {/* Device Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
          <div 
            className="transform-gpu"
            style={{ 
              ...getDeviceStyle(), 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'center center' 
            }}
          >
            <div className="bg-white rounded-xl overflow-hidden flex-1 relative">
              {expoStatus.isRunning && webUrl && webUrl !== 'about:blank' ? (
                <iframe
                  key={`${webUrl}-${iframeKey}`} // Force re-render on URL change OR hot reload
                  src={webUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  title="App Preview"
                  onLoad={() => {
                    console.log('✅ Iframe loaded successfully for:', webUrl);
                    setIframeRetryCount(0); // Reset retry count on successful load
                    if (!expoStatus.buildStatus || expoStatus.buildStatus === 'idle') {
                      setStatusMessage("App loaded successfully!");
                    }
                  }}
                  onError={(e) => {
                    console.error('❌ Iframe load error for:', webUrl, e);
                    retryIframeLoad();
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'white'
                  }}
                />
              ) : expoStatus.isRunning ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-center p-8">
                  <div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-lg font-medium">⏳ Waiting for Metro bundler...</p>
                    <p className="text-sm mt-2 opacity-70">
                      {webUrl ? 'Metro is building your app...' : 'Detecting Metro server...'}
                    </p>
                    {iframeRetryCount > 0 && (
                      <p className="text-xs mt-1 text-yellow-600">
                        Retrying connection ({iframeRetryCount}/3)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-center p-8">
                  <div>
                    {isStarting ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                        <p className="text-lg font-medium">🚀 Auto-starting preview...</p>
                        <p className="text-sm mt-2 opacity-70">Setting up Expo development server</p>
                      </>
                    ) : selectedAppId ? (
                      <>
                        <Smartphone className="h-20 w-20 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">Ready to preview</p>
                        <p className="text-sm mt-2 opacity-70">Preview will start automatically</p>
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-20 w-20 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">Your app will appear here</p>
                        <p className="text-sm mt-2 opacity-70">Select an app to preview</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Panel */}
      {hasQr && (
        <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <QrCodeIcon className="h-6 w-6 mx-auto mb-4" />
                <h3 className="font-semibold mb-4">Test on Your Phone</h3>
                
                {qrCodeDataUrl && (
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code for Expo Go" 
                      className="w-48 h-auto rounded-lg border shadow-sm"
                      style={{ 
                        maxWidth: '192px', 
                        height: 'auto',
                        aspectRatio: '1/1',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>iPhone:</strong> Open Camera app and scan</p>
                  <p><strong>Android:</strong> Open Expo Go app and scan</p>
                  <p className="text-xs mt-4">
                    Make sure Expo Go is installed from your app store
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}