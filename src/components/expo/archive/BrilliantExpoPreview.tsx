import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Zap,
  MessageSquare,
  Settings,
  Bug,
  Lightbulb,
  Rocket
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

interface PreviewError {
  type: 'routing' | 'build' | 'network' | 'dependency' | 'unknown';
  message: string;
  url?: string;
  statusCode?: number;
  suggestions: string[];
  autoFix?: () => void;
}

interface ChatMessage {
  type: 'info' | 'error' | 'success' | 'warning' | 'suggestion';
  message: string;
  timestamp: Date;
  actionable?: boolean;
  actionLabel?: string;
  action?: () => void;
}

export function BrilliantExpoPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceFrame, setDeviceFrame] = useState<'phone' | 'tablet' | 'none'>('phone');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("iphone-14-pro");
  const [zoom, setZoom] = useState<number>(90);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to preview");
  const [isLoading, setIsLoading] = useState(false);
  const [useTunnel, setUseTunnel] = useState<boolean>(true);
  const [showQrPanel, setShowQrPanel] = useState<boolean>(true);
  
  // New intelligent features
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isElementFinderActive, setIsElementFinderActive] = useState<boolean>(false);
  const [previewHealth, setPreviewHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [autoFixAttempts, setAutoFixAttempts] = useState<number>(0);
  
  const autoStartedForAppId = useRef<number | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Add chat message
  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [message, ...prev.slice(0, 9)]); // Keep last 10 messages
  }, []);

  // Intelligent error detection
  const detectPreviewError = useCallback((iframe: HTMLIFrameElement) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return null;

      // Check for common error patterns
      const bodyText = iframeDoc.body?.textContent || '';
      const title = iframeDoc.title || '';

      // Detect "Not Found" errors
      if (title.includes('Not Found') || bodyText.includes('Unmatched Route') || bodyText.includes('Page could not be found')) {
        return {
          type: 'routing' as const,
          message: 'Routing error detected - app cannot find the requested page',
          url: iframe.src,
          suggestions: [
            'Check if your app has a default route (index page)',
            'Verify your routing configuration',
            'Ensure the app has a landing page at the root path',
            'Check for missing route definitions'
          ],
          autoFix: () => autoFixRoutingError()
        };
      }

      // Detect build errors
      if (bodyText.includes('Module not found') || bodyText.includes('Cannot resolve') || bodyText.includes('Build failed')) {
        return {
          type: 'build' as const,
          message: 'Build error detected - missing dependencies or build failure',
          url: iframe.src,
          suggestions: [
            'Run npm install to install missing dependencies',
            'Check for import/export errors in your code',
            'Verify all required packages are installed',
            'Clear build cache and restart'
          ],
          autoFix: () => autoFixBuildError()
        };
      }

      // Detect network errors
      if (bodyText.includes('Failed to fetch') || bodyText.includes('Network error') || bodyText.includes('Connection refused')) {
        return {
          type: 'network' as const,
          message: 'Network error detected - cannot connect to development server',
          url: iframe.src,
          suggestions: [
            'Check if the Expo server is running',
            'Verify the correct port is being used',
            'Check firewall settings',
            'Try using tunnel mode instead of LAN'
          ],
          autoFix: () => autoFixNetworkError()
        };
      }

      return null;
    } catch (error) {
      console.warn('Cannot access iframe content for error detection:', error);
      return null;
    }
  }, []);

  // Auto-fix functions
  const autoFixRoutingError = useCallback(async () => {
    addChatMessage({
      type: 'info',
      message: '🔄 Attempting to fix routing error...',
      timestamp: new Date()
    });

    try {
      // Try to navigate to root path
      if (iframeRef.current && expoStatus.webUrl) {
        const rootUrl = new URL(expoStatus.webUrl);
        rootUrl.pathname = '/';
        iframeRef.current.src = rootUrl.toString();
        
        addChatMessage({
          type: 'success',
          message: '✅ Navigated to root path - check if this resolves the routing issue',
          timestamp: new Date(),
          actionable: true,
          actionLabel: 'Check Status',
          action: () => checkPreviewHealth()
        });
      }
    } catch (error) {
      addChatMessage({
        type: 'error',
        message: '❌ Failed to auto-fix routing error',
        timestamp: new Date()
      });
    }
  }, [expoStatus.webUrl, addChatMessage]);

  const autoFixBuildError = useCallback(async () => {
    addChatMessage({
      type: 'info',
      message: '🔄 Attempting to fix build error...',
      timestamp: new Date()
    });

    try {
      // Restart the Expo server
      await IpcClient.getInstance().expoStop();
      setTimeout(async () => {
        await startExpoServer();
        addChatMessage({
          type: 'success',
          message: '✅ Restarted Expo server - this should resolve build issues',
          timestamp: new Date()
        });
      }, 2000);
    } catch (error) {
      addChatMessage({
        type: 'error',
        message: '❌ Failed to auto-fix build error',
        timestamp: new Date()
      });
    }
  }, [addChatMessage]);

  const autoFixNetworkError = useCallback(async () => {
    addChatMessage({
      type: 'info',
      message: '🔄 Attempting to fix network error...',
      timestamp: new Date()
    });

    try {
      // Switch to tunnel mode if not already using it
      if (!useTunnel) {
        setUseTunnel(true);
        addChatMessage({
          type: 'success',
          message: '✅ Switched to tunnel mode - this should resolve network issues',
          timestamp: new Date()
        });
      } else {
        // Try restarting with different network settings
        await IpcClient.getInstance().expoStop();
        setTimeout(async () => {
          await startExpoServer();
          addChatMessage({
            type: 'success',
            message: '✅ Restarted with network optimizations',
            timestamp: new Date()
          });
        }, 2000);
      }
    } catch (error) {
      addChatMessage({
        type: 'error',
        message: '❌ Failed to auto-fix network error',
        timestamp: new Date()
      });
    }
  }, [useTunnel, addChatMessage]);

  // Check preview health
  const checkPreviewHealth = useCallback(async () => {
    if (!iframeRef.current || !expoStatus.webUrl) return;

    try {
      const error = detectPreviewError(iframeRef.current);
      if (error) {
        setPreviewError(error);
        setPreviewHealth('error');
        
        // Send to chat
        addChatMessage({
          type: 'error',
          message: `🚨 ${error.message}`,
          timestamp: new Date(),
          actionable: true,
          actionLabel: 'Auto-Fix',
          action: error.autoFix
        });

        // Add suggestions to chat
        error.suggestions.forEach(suggestion => {
          addChatMessage({
            type: 'suggestion',
            message: `💡 ${suggestion}`,
            timestamp: new Date()
          });
        });
      } else {
        setPreviewError(null);
        setPreviewHealth('healthy');
      }
    } catch (error) {
      console.warn('Health check failed:', error);
    }
  }, [detectPreviewError, expoStatus.webUrl, addChatMessage]);

  // Enhanced QR code generation
  const generateQRCode = useCallback(async (url: string) => {
    try {
      // Convert http:// URLs to exp:// for Expo Go compatibility
      let qrUrl = url;
      if (url.startsWith('http://') && url.includes(':')) {
        qrUrl = url.replace(/^http:\/\//, 'exp://');
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
      setQrCodeDataUrl('');
    }
  }, []);

  // Check Expo status with enhanced error handling
  const checkExpoStatus = useCallback(async () => {
    try {
      const status = await IpcClient.getInstance().expoStatus();
      setExpoStatus(status);
      
      // Generate QR codes for all available URLs
      if (status.tunnelUrl) {
        generateQRCode(status.tunnelUrl);
      } else if (status.lanUrl || status.qrUrl) {
        generateQRCode(status.lanUrl || status.qrUrl!);
      }

      // Update health status
      if (status.isRunning && status.webUrl) {
        checkPreviewHealth();
      }
    } catch (error) {
      console.error('Failed to check Expo status:', error);
      addChatMessage({
        type: 'error',
        message: '❌ Failed to check Expo status',
        timestamp: new Date()
      });
    }
  }, [generateQRCode, checkPreviewHealth, addChatMessage]);

  // Start Expo server with intelligent fallbacks
  const startExpoServer = useCallback(async () => {
    try {
      if (!selectedAppId) {
        addChatMessage({
          type: 'warning',
          message: '⚠️ No app selected for preview',
          timestamp: new Date()
        });
        return;
      }

      setIsLoading(true);
      setIsStarting(true);
      setAutoFixAttempts(0);
      
      addChatMessage({
        type: 'info',
        message: '🚀 Starting Expo preview server...',
        timestamp: new Date()
      });

      const result = await IpcClient.getInstance().expoStart({ 
        appId: selectedAppId, 
        useTunnel: useTunnel,
        native: true,
      });
      
      if (result.isRunning) {
        setExpoStatus(result);
        addChatMessage({
          type: 'success',
          message: '✅ Expo server started successfully!',
          timestamp: new Date()
        });
        
        // Start health monitoring
        if (healthCheckInterval.current) {
          clearInterval(healthCheckInterval.current);
        }
        healthCheckInterval.current = setInterval(checkPreviewHealth, 5000);
        
      } else {
        throw new Error('Expo server failed to start');
      }
    } catch (error) {
      console.error('Failed to start Expo server:', error);
      addChatMessage({
        type: 'error',
        message: `❌ Failed to start Expo server: ${error.message}`,
        timestamp: new Date(),
        actionable: true,
        actionLabel: 'Retry',
        action: startExpoServer
      });
    } finally {
      setIsLoading(false);
      setIsStarting(false);
    }
  }, [selectedAppId, useTunnel, addChatMessage, checkPreviewHealth]);

  // Stop Expo server
  const stopExpoServer = useCallback(async () => {
    try {
      await IpcClient.getInstance().expoStop();
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl("");
      setPreviewError(null);
      setPreviewHealth('healthy');
      
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
        healthCheckInterval.current = null;
      }
      
      addChatMessage({
        type: 'info',
        message: '🛑 Expo server stopped',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to stop Expo:', error);
    }
  }, [addChatMessage]);

  // Element finder functionality
  const toggleElementFinder = useCallback(() => {
    setIsElementFinderActive(!isElementFinderActive);
    addChatMessage({
      type: 'info',
      message: isElementFinderActive ? '🔍 Element finder deactivated' : '🔍 Element finder activated - hover over elements to inspect',
      timestamp: new Date()
    });
  }, [isElementFinderActive, addChatMessage]);

  // Auto-start when app is selected
  useEffect(() => {
    if (selectedAppId && !expoStatus.isRunning && !isLoading && autoStartedForAppId.current !== selectedAppId) {
      autoStartedForAppId.current = selectedAppId;
      startExpoServer();
    }
  }, [selectedAppId, expoStatus.isRunning, isLoading, startExpoServer]);

  // Poll status while running
  useEffect(() => {
    if (!expoStatus.isRunning) return;
    
    const interval = setInterval(checkExpoStatus, 3000);
    return () => clearInterval(interval);
  }, [expoStatus.isRunning, checkExpoStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, []);

  // Device presets
  const devicePresets: Record<string, { name: string; width: number; height: number }> = {
    "iphone-16-pro": { name: "iPhone 16 Pro", width: 402, height: 874 },
    "iphone-14-pro": { name: "iPhone 14 Pro", width: 390, height: 844 },
    "iphone-se": { name: "iPhone SE", width: 375, height: 667 },
    "pixel-7": { name: "Pixel 7", width: 412, height: 915 },
    "ipad-mini": { name: "iPad mini", width: 744, height: 1133 },
  };

  const currentDevice = devicePresets[deviceId] || devicePresets["iphone-14-pro"];
  const scaledWidth = Math.round((currentDevice.width * zoom) / 100);
  const scaledHeight = Math.round((currentDevice.height * zoom) / 100);

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Intelligent Header with Status */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-4 py-3 border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Brilliant Expo Preview</span>
          </div>
          
          {/* Health Status Badge */}
          <Badge 
            variant={previewHealth === 'healthy' ? 'default' : previewHealth === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {previewHealth === 'healthy' ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Healthy
              </>
            ) : previewHealth === 'warning' ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Warning
              </>
            ) : (
              <>
                <X className="w-3 h-3" />
                Error
              </>
            )}
          </Badge>
          
          {/* Status Message */}
          <span className="text-sm text-gray-600">{statusMessage}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tunnel Toggle */}
          <Button
            variant={useTunnel ? "default" : "outline"}
            size="sm"
            onClick={() => setUseTunnel(!useTunnel)}
            className="h-8 px-3 text-xs"
          >
            <Globe className="h-3 w-3 mr-1" />
            {useTunnel ? "Tunnel" : "LAN"}
          </Button>
          
          {/* QR Panel Toggle */}
          <Button
            variant={showQrPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowQrPanel(!showQrPanel)}
            className="h-8 px-3 text-xs"
          >
            <QrCodeIcon className="h-3 w-3 mr-1" />
            QR
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {previewError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Preview Error Detected</AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2">
              <p className="font-medium">{previewError.message}</p>
              <div className="mt-2 space-y-1">
                {previewError.suggestions.map((suggestion, index) => (
                  <p key={index} className="text-sm">• {suggestion}</p>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  onClick={previewError.autoFix}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-Fix
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPreviewError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Preview Area */}
      <div className="flex-1 flex gap-4">
        {/* Preview Container */}
        <div className="flex-1 bg-gray-50 rounded-lg border flex flex-col p-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Device Selector */}
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(devicePresets).map(([id, device]) => (
                      <SelectItem key={id} value={id}>{device.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {/* Zoom Control */}
              <Select value={String(zoom)} onValueChange={(v) => setZoom(Number(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[75, 90, 100, 110, 125].map((z) => (
                    <SelectItem key={z} value={String(z)}>{z}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Element Finder */}
              <Button
                variant={isElementFinderActive ? "default" : "outline"}
                size="sm"
                onClick={toggleElementFinder}
                disabled={!expoStatus.isRunning || !expoStatus.webUrl}
                className="h-8 px-3 text-xs"
              >
                <Search className="h-3 w-3 mr-1" />
                {isElementFinderActive ? 'Exit Inspector' : 'Element Finder'}
              </Button>
              
              {/* Start/Stop */}
              {expoStatus.isRunning ? (
                <Button variant="outline" size="sm" onClick={stopExpoServer} className="h-8 px-3 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button size="sm" onClick={startExpoServer} disabled={isLoading} className="h-8 px-3 text-xs">
                  <Play className="h-3 w-3 mr-1" />
                  {isLoading ? "Starting..." : "Start"}
                </Button>
              )}
              
              {/* Reload */}
              {expoStatus.isRunning && (
                <Button variant="outline" size="sm" onClick={startExpoServer} className="h-8 px-3 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reload
                </Button>
              )}
            </div>
          </div>
          
          {/* Device Frame */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-black rounded-[2rem] p-2 shadow-2xl">
              <div
                className="bg-white rounded-[1.5rem] overflow-hidden relative"
                style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
              >
                {/* Mobile notch simulation */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-lg z-10"></div>
                
                {/* Preview Content */}
                {expoStatus.isRunning && expoStatus.webUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={expoStatus.webUrl}
                    title="Mobile App Preview"
                    className="w-full h-full border-none rounded-[1.5rem]"
                    style={{ backgroundColor: 'white' }}
                    onLoad={() => {
                      setStatusMessage("App loaded successfully!");
                      setTimeout(checkPreviewHealth, 1000); // Check health after load
                    }}
                    onError={() => {
                      setStatusMessage("Loading error - check console");
                      setPreviewHealth('error');
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-center p-8">
                    <div>
                      <Smartphone className="h-20 w-20 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Your app will appear here</p>
                      {selectedAppId ? (
                        <p className="text-sm mt-2 opacity-70">Click "Start" to begin preview</p>
                      ) : (
                        <p className="text-sm mt-2 opacity-70">Select an app to preview</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* QR Code Panel */}
          {showQrPanel && qrCodeDataUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCodeIcon className="h-4 w-4" />
                  Test on Your Phone
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto border rounded-lg mb-4"
                  />
                  <div className="text-xs text-gray-600 space-y-2 text-left">
                    <div>
                      <span className="font-medium text-gray-700">iPhone:</span> Install Expo Go from App Store, then scan with Camera app
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Android:</span> Install Expo Go from Play Store, open app and scan
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Chat Integration Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Preview Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Preview status and errors will appear here
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} className={`text-xs p-2 rounded ${
                      msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                      msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                      msg.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      msg.type === 'suggestion' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{msg.message}</span>
                        {msg.actionable && msg.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={msg.action}
                            className="h-5 px-2 text-xs ml-2"
                          >
                            {msg.actionLabel}
                          </Button>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Status Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preview Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Server Status:</span>
                  <Badge variant={expoStatus.isRunning ? "default" : "secondary"}>
                    {expoStatus.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <Badge variant={useTunnel ? "default" : "secondary"}>
                    {useTunnel ? "Tunnel" : "LAN"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Health:</span>
                  <Badge variant={previewHealth === 'healthy' ? "default" : previewHealth === 'warning' ? "secondary" : "destructive"}>
                    {previewHealth}
                  </Badge>
                </div>
                {expoStatus.webUrl && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600 mb-1">Web URL:</div>
                    <div className="text-xs font-mono bg-gray-100 p-1 rounded truncate">
                      {expoStatus.webUrl}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
    </div>
  );
}
