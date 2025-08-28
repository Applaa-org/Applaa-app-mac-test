import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  Globe, 
  QrCode as QrCodeIcon,
  ExternalLink,
  RefreshCw,
  Code,
  Play,
  Eye,
  RotateCcw
} from "lucide-react";
import QRCode from "qrcode";
import { IpcClient } from "@/ipc/ipc_client";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
}

export function MobilePreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceFrame, setDeviceFrame] = useState<'phone' | 'tablet' | 'none'>('phone');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("iphone-14-pro");
  const [zoom, setZoom] = useState<number>(90);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to preview");

  const [isLoading, setIsLoading] = useState(false);
  const autoStartedForAppId = useRef<number | null>(null);

  // Additional state variables for QR codes and progress
  const [tunnelQrDataUrl, setTunnelQrDataUrl] = useState<string>("");
  const [lanQrDataUrl, setLanQrDataUrl] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [showQrPanel, setShowQrPanel] = useState<boolean>(true);
  const [useTunnel, setUseTunnel] = useState<boolean>(true);
  const startTimeRef = useRef<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging
  useEffect(() => {
      console.log('🔍 MobilePreview Debug:', {
    selectedAppId,
    isRunning: expoStatus.isRunning,
    isLoading,
    autoStartedForAppId: autoStartedForAppId.current
  });
}, [selectedAppId, expoStatus.isRunning, isLoading]);

// Helper function to extract code from Snack URL
const getSnackCodeFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const codeParam = urlObj.searchParams.get('code');
    return codeParam ? decodeURIComponent(codeParam) : '';
  } catch (error) {
    console.error('Failed to extract code from Snack URL:', error);
    return '';
  }
};

  const generateQRCode = useCallback(async (url: string) => {
    try {
      // Convert http:// URLs to exp:// for Expo Go compatibility
      let qrUrl = url;
      if (url.startsWith('http://') && url.includes(':')) {
        qrUrl = url.replace(/^http:\/\//, 'exp://');
        console.log(`🔄 Converting main QR: ${url} → ${qrUrl}`);
      }
      
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      // Fallback: don't show QR code for problematic URLs
      setQrCodeDataUrl('');
    }
  }, []);

  const generateQrToSetter = useCallback(
    async (url: string, setter: (v: string) => void) => {
      try {
        // Convert http:// URLs to exp:// for Expo Go compatibility
        let qrUrl = url;
        if (url.startsWith('http://') && url.includes(':')) {
          qrUrl = url.replace(/^http:\/\//, 'exp://');
          console.log(`🔄 Converting for QR: ${url} → ${qrUrl}`);
        }
        
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setter(qrDataUrl);
      } catch (e) {
        setter("");
      }
    },
    [],
  );

  const checkExpoStatus = useCallback(async () => {
    try {
      const status = await IpcClient.getInstance().expoStatus();
      setExpoStatus(status);
      
      // Always generate QR codes for mobile testing (RORK.com style)
      if (status.tunnelUrl) {
        generateQrToSetter(status.tunnelUrl, setTunnelQrDataUrl);
      }
      if (status.lanUrl || status.qrUrl) {
        const lan = status.lanUrl || status.qrUrl!;
        generateQrToSetter(lan, setLanQrDataUrl);
      }
      // Main QR prioritizes tunnel, then LAN
      const qrUrl = status.tunnelUrl || status.lanUrl || status.qrUrl;
      if (qrUrl) generateQRCode(qrUrl);

      // If we have a webUrl but are still starting, do a health check
      if (isStarting && status.webUrl && status.isRunning) {
        try {
          const health = await IpcClient.getInstance().expoHealthCheck();
          console.log('🏥 Health check result:', health);
          if (health.healthy) {
            console.log('✅ Server confirmed healthy - updating progress to 90%');
            setLoadingProgress(90);
          }
        } catch (error) {
          console.warn('Health check failed:', error);
        }
      }
    } catch (error) {
      console.error('Failed to check Expo status:', error);
    }
  }, [generateQRCode, isStarting]);

  const startExpoServer = useCallback(async () => {
    try {
      if (!selectedAppId) {
        console.error('No app selected');
        return;
      }

      setIsLoading(true);
      setIsStarting(true);
      // Start animated progress similar to Expo Go while starting server
      setLoadingProgress(0);
      startTimeRef.current = Date.now();
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      // Simple initial progress - real progress comes from server events
      setLoadingProgress(10);
      console.log('🚀 Starting local Expo server for app:', selectedAppId);
      
      const result = await IpcClient.getInstance().expoStart({ 
        appId: selectedAppId, 
        useTunnel: true, // Always enable tunnel for QR codes
        native: true, // Generate exp:// URLs for QR codes
      });
      
      if (result.isRunning) {
        setExpoStatus(result);
        
        // Prefer tunnel or LAN URL for QR code
        // Always generate QR codes for mobile testing
        if (result.tunnelUrl) generateQrToSetter(result.tunnelUrl, setTunnelQrDataUrl);
        if (result.lanUrl || result.qrUrl) generateQrToSetter(result.lanUrl || result.qrUrl, setLanQrDataUrl);
        const preferred = result.tunnelUrl || result.lanUrl || result.qrUrl;
        if (preferred) generateQRCode(preferred);
        
        console.log('✅ Expo server ready:', result.webUrl);
        // Progress will complete when webUrl becomes available
      }
    } catch (error) {
      console.error('❌ Failed to start Expo server:', error);
    } finally {
      // We'll keep isLoading true until webUrl is detected
    }
  }, [selectedAppId, useTunnel, generateQRCode]);

  const startExpo = useCallback(async () => {
    return startExpoServer();
  }, [startExpoServer]);

  const stopExpo = async () => {
    try {
      await IpcClient.getInstance().expoStop();
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl("");
    } catch (error) {
      console.error('Failed to stop Expo:', error);
    }
  };

  useEffect(() => {
    checkExpoStatus();
    const needsFastPoll =
      isStarting ||
      (expoStatus.isRunning && (!expoStatus.webUrl || !(qrCodeDataUrl || expoStatus.qrUrl || expoStatus.lanUrl || expoStatus.tunnelUrl)));
    const pollingMs = needsFastPoll ? 1000 : 10000;
    const interval = setInterval(checkExpoStatus, pollingMs);
    return () => clearInterval(interval);
  }, [checkExpoStatus, isStarting, expoStatus.isRunning, expoStatus.webUrl, qrCodeDataUrl, expoStatus.qrUrl, expoStatus.lanUrl, expoStatus.tunnelUrl]);

  // Restart Expo when preview mode or tunnel toggle changes
  useEffect(() => {
    if (!selectedAppId) return;
    // Soft restart: stop then start
    (async () => {
      await stopExpo();
      await startExpoServer();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTunnel]);

  // Real server handshake - progress reflects actual server state
  useEffect(() => {
    if (!isStarting) return;

    const hasWeb = Boolean(expoStatus.webUrl);
    const hasQr = Boolean(qrCodeDataUrl || expoStatus.qrUrl || expoStatus.lanUrl || expoStatus.tunnelUrl);
    
    // Update progress based on actual server milestones
    if (expoStatus.isRunning && !hasWeb && !hasQr) {
      // Server starting but no URLs yet
      setLoadingProgress(40);
      console.log('📱 Server process running - 40%');
    } else if (expoStatus.isRunning && (hasWeb || hasQr)) {
      // Server has URLs - test connectivity
      setLoadingProgress(70);
      console.log('🔗 URLs detected, testing connectivity - 70%', { hasWeb, hasQr });
    }
    
    // Safety timeout check - complete even if not perfect
    const hasTimedOut = startTimeRef.current && (Date.now() - startTimeRef.current > 20000);
    if (hasTimedOut || (expoStatus.isRunning && (hasWeb || hasQr))) {
      if (hasTimedOut) {
        console.warn('⏰ Progress timeout after 20s - completing anyway');
      } else {
        console.log('✅ Server ready with URLs - completing', { 
          webUrl: expoStatus.webUrl, 
          qrUrl: expoStatus.qrUrl,
          lanUrl: expoStatus.lanUrl,
          tunnelUrl: expoStatus.tunnelUrl 
        });
      }
      setLoadingProgress(100);
      setIsStarting(false);
      setIsLoading(false);
      startTimeRef.current = null;
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
  }, [isStarting, expoStatus.isRunning, expoStatus.webUrl, expoStatus.qrUrl, expoStatus.lanUrl, expoStatus.tunnelUrl, qrCodeDataUrl]);

  // Automatic preview start - triggers immediately when app is selected
  useEffect(() => {
    if (selectedAppId && !expoStatus.isRunning && !isLoading && autoStartedForAppId.current !== selectedAppId) {
      console.log('📱 Mobile app selected, auto-starting local Expo server for app:', selectedAppId);
      autoStartedForAppId.current = selectedAppId;
      startExpoServer();
    }
  }, [selectedAppId, expoStatus.isRunning, isLoading, startExpoServer]);



  const getDeviceFrameStyle = () => {
    switch (deviceFrame) {
      case 'phone':
        return {
          width: '375px',
          height: '667px',
          borderRadius: '40px',
          border: '8px solid #1a1a1a',
          backgroundColor: '#000'
        };
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          borderRadius: '20px',
          border: '6px solid #1a1a1a',
          backgroundColor: '#000'
        };
      default:
        return {};
    }
  };

  // Common device presets (CSS px approximations for preview only)
  const devicePresets: Record<string, { name: string; width: number; height: number }> = {
    "iphone-16-pro": { name: "iPhone 16 Pro", width: 402, height: 874 },
    "iphone-14-pro": { name: "iPhone 14 Pro", width: 390, height: 844 },
    "iphone-se": { name: "iPhone SE", width: 375, height: 667 },
    "pixel-7": { name: "Pixel 7", width: 412, height: 915 },
    "pixel-5": { name: "Pixel 5", width: 393, height: 851 },
    "ipad-mini": { name: "iPad mini", width: 744, height: 1133 },
  };

  const currentDevice = devicePresets[deviceId] || devicePresets["iphone-14-pro"];
  const scaledWidth = Math.round((currentDevice.width * zoom) / 100);
  const scaledHeight = Math.round((currentDevice.height * zoom) / 100);

  return (
    <div className="flex flex-col h-full space-y-3 p-3">
      {/* Compact Header with Status and Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 border">
        <div className="flex items-center gap-2">
          <img src="/assets/applaa-logo.svg" className="w-4 h-4" alt="Applaa" />
          <span className="text-sm font-medium">Mobile Preview + QR Scan</span>
          {isStarting || (expoStatus.isRunning && !expoStatus.webUrl) ? (
            <div className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-600">Starting...</span>
            </div>
          ) : expoStatus.isRunning ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-500">Waiting...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle QR Panel */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">QR Panel</span>
            <Button
              variant={showQrPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowQrPanel(!showQrPanel)}
              className="h-7 px-2 text-xs"
            >
              <QrCodeIcon className="h-3 w-3 mr-1" />
              {showQrPanel ? "Hide" : "Show"}
            </Button>
          </div>
          
          {/* Tunnel Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Tunnel</span>
            <Button
              variant={useTunnel ? "default" : "outline"}
              size="sm"
              onClick={() => setUseTunnel(!useTunnel)}
              className="h-7 px-2 text-xs"
            >
              <Globe className="h-3 w-3 mr-1" />
              {useTunnel ? "On" : "Off"}
            </Button>
          </div>
          
          {/* Reset button - always available */}
          <Button 
            variant="outline"
            size="sm"
            onClick={async () => {
              console.log('🔄 Resetting preview state');
              await IpcClient.getInstance().expoStop();
              setIsLoading(false);
              setIsStarting(false);
              setLoadingProgress(0);
              setQrCodeDataUrl("");
              setLanQrDataUrl("");
              setTunnelQrDataUrl("");
              setExpoStatus({ isRunning: false });
              autoStartedForAppId.current = null;
              startTimeRef.current = null;
              if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
              }
            }}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
          
          {/* Other controls only show when server is running */}
          {expoStatus.isRunning && Boolean(expoStatus.webUrl) && (
            <>
            {/* Device selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Size</span>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger className="h-7 w-[160px] text-xs">
                  <SelectValue placeholder="Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(devicePresets).map(([id, d]) => (
                      <SelectItem key={id} value={id}>{d.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Zoom selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Zoom</span>
              <Select value={String(zoom)} onValueChange={(v) => setZoom(Number(v))}>
                <SelectTrigger className="h-7 w-[72px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[75, 90, 100, 110, 125].map((z) => (
                    <SelectItem key={z} value={String(z)}>{z}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline"
              size="sm"
              onClick={() => startExpoServer()}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reload
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.open(expoStatus.webUrl!, "_blank")}
              className="h-7 px-2 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              External
            </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Area with Side QR Code */}
      {expoStatus.isRunning && (expoStatus.webUrl || expoStatus.lanUrl || expoStatus.qrUrl) ? (
        <div className="flex-1 flex gap-3">
          {/* Mobile Preview Container */}
          <div className="flex-1 bg-gray-100 rounded-lg border flex items-center justify-center p-3">
            <div className="bg-black rounded-[2rem] p-2 shadow-2xl">
              <div
                className="bg-white rounded-[1.5rem] overflow-hidden relative"
                style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
              >
                {/* Mobile notch/status bar simulation */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-lg z-10"></div>
                {/* Always show web iframe (RORK.com style) */}
                <iframe
                  src={expoStatus.webUrl || `http://localhost:8081`}
                  title="Mobile App Preview"
                  className="w-full h-full border-none rounded-[1.5rem]"
                  style={{ backgroundColor: 'white' }}
                  onLoad={() => console.log('✅ Preview iframe loaded successfully')}
                  onError={(e) => console.error('❌ Preview iframe failed to load:', e)}
                />
              </div>
            </div>
          </div>
          
          {/* Side Panel with QR Code and Device Testing */}
          {showQrPanel && (
          <div className="w-48 flex flex-col gap-3">
            {/* QR Code Section */}
            {qrCodeDataUrl && (
              <div className="bg-white rounded-lg border p-3">
                <div className="text-center">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-24 h-24 mx-auto border rounded mb-2"
                  />
                  <h4 className="text-sm font-medium mb-1">Test on your phone</h4>
                  <p className="text-xs text-gray-500 mb-3">Scan this QR code</p>
                  <div className="text-xs text-gray-500 text-left space-y-2 mb-2">
                    <div>
                      <span className="font-medium text-gray-700">iPhone:</span> Install Expo Go from the App Store. Then open the Camera app and scan the QR to open in Expo Go.
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Android:</span> Install Expo Go from Google Play. Open Expo Go, tap Scan, then point to the QR.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => IpcClient.getInstance().openExternalUrl("https://apps.apple.com/app/expo-go/id982107779")}
                    >
                      iOS: Get Expo Go
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => IpcClient.getInstance().openExternalUrl("https://play.google.com/store/apps/details?id=host.exp.exponent")}
                    >
                      Android: Get Expo Go
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Additional Info */}
            <div className="bg-gray-900 text-white rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="font-medium">Browser preview lacks native functions & looks different.</span>
              </div>
              <p className="text-gray-300">Test on device for the best results.</p>
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center p-8">
          <div className="text-center text-gray-600 w-full max-w-sm">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-medium mb-2">Mobile Preview</h3>
            {isStarting || (expoStatus.isRunning && !expoStatus.webUrl) ? (
              <>
                <p className="text-sm mb-4">
                  {loadingProgress < 20 ? "Initializing Expo server..." :
                   loadingProgress < 50 ? "Starting development server..." :
                   loadingProgress < 80 ? "Configuring network access..." :
                   loadingProgress < 95 ? "Testing server connectivity..." :
                   "Finalizing setup..."}
                </p>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-xs mt-2">{loadingProgress}%</p>
                {expoStatus.isRunning && (
                  <p className="text-xs text-green-600 mt-1">✓ Server process running</p>
                )}
              </>
            ) : !selectedAppId ? (
              <p className="text-sm">Select a mobile app to see live preview</p>
            ) : (
              <p className="text-sm">Preparing preview...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


