import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MousePointerClick, Smartphone, Tablet, Monitor, RotateCcw, Zap, QrCode as QrCodeIcon, Play, Square, ExternalLink } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode from 'qrcode';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';

interface ResponsiveMobilePreviewProps {
  // No props needed - uses selectedAppIdAtom
}

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_PRESETS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE', scale: 1 },
  tablet: { width: 768, height: 1024, name: 'iPad', scale: 0.8 },
  desktop: { width: 1200, height: 800, name: 'Desktop', scale: 0.7 }
};

export const ResponsiveMobilePreview: React.FC<ResponsiveMobilePreviewProps> = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });

  // Debug logging for selectedAppId
  useEffect(() => {
    console.log('🔍 ResponsiveMobilePreview Debug:', {
      selectedAppId,
      type: typeof selectedAppId,
      isNull: selectedAppId === null,
      isUndefined: selectedAppId === undefined,
      buttonShouldBeDisabled: !selectedAppId
    });
  }, [selectedAppId]);
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [isElementSelectorActive, setIsElementSelectorActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Smart URL detection with comprehensive logging
  const getWebUrl = () => {
    console.log('📱 URL Detection (DETAILED):', {
      webUrl: expoStatus.webUrl,
      tunnelUrl: expoStatus.tunnelUrl,
      lanUrl: expoStatus.lanUrl,
      qrUrl: expoStatus.qrUrl,
      isRunning: expoStatus.isRunning,
      selectedAppId,
      fullStatus: expoStatus
    });

    // Priority order: webUrl > localhost fallback > about:blank
    if (expoStatus.webUrl) {
      console.log('✅ Using webUrl:', expoStatus.webUrl);
      return expoStatus.webUrl;
    }
    
    if (expoStatus.isRunning) {
      console.log('⚠️ No webUrl, using localhost fallback');
      return 'http://localhost:8081';
    }
    
    console.log('❌ No server running, using about:blank');
    return 'about:blank';
  };

  const webUrl = getWebUrl();
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

  // Start Expo server with tunnel support
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId || isStarting) return;

    try {
      setIsStarting(true);
      console.log('🚀 Starting Expo server with tunnel support...');
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.expoStart({ 
        appId: selectedAppId, 
        useTunnel: true, // Always enable tunnel for QR codes
        native: true, // Enable native URLs for mobile
      });
      
      console.log('📊 Expo start result:', result);
      
      if (result.isRunning) {
        setExpoStatus(result);
        
        // Generate QR code for mobile testing (prioritize tunnel URL)
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          await generateQRCode(qrUrl);
          setShowQrPanel(true);
          console.log('📱 QR code generated for mobile testing:', qrUrl);
        }
        
        console.log('✅ Expo server started successfully');
      } else {
        throw new Error('Expo server failed to start');
      }
    } catch (error) {
      console.error('❌ Failed to start Expo server:', error);
    } finally {
      setIsStarting(false);
    }
  }, [selectedAppId, isStarting, generateQRCode]);

  // Stop Expo server
  const stopExpoServer = useCallback(async () => {
    if (isStopping) return;

    try {
      setIsStopping(true);
      console.log('🛑 Stopping Expo server...');
      
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl('');
      setShowQrPanel(false);
      setIsReady(false);
      
      console.log('✅ Expo server stopped');
    } catch (error) {
      console.error('❌ Failed to stop Expo server:', error);
    } finally {
      setIsStopping(false);
    }
  }, [isStopping]);

  // Poll Expo status
  useEffect(() => {
    if (!selectedAppId) return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.expoStatus();
        
        // Update status
        setExpoStatus(status);
        
        // Generate QR code if we have tunnel/mobile URLs and don't have one yet
        if (status.isRunning && !qrCodeDataUrl) {
          const qrUrl = status.tunnelUrl || status.qrUrl || status.lanUrl;
          if (qrUrl) {
            await generateQRCode(qrUrl);
            setShowQrPanel(true);
          }
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
  }, [selectedAppId, qrCodeDataUrl, generateQRCode]);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('✅ Iframe loaded successfully:', webUrl);
    setIsReady(true);
    
    // Try to inject element selector after load
    setTimeout(() => {
      injectElementSelector();
    }, 1000);
  };

  // Handle iframe errors
  const handleIframeError = (event: any) => {
    console.error('❌ Iframe failed to load:', {
      url: webUrl,
      error: event,
      expoStatus,
      timestamp: new Date().toISOString()
    });
    
    // Try to diagnose the issue
    if (webUrl.includes('localhost:8081')) {
      console.log('🔍 Localhost connection failed - checking if Expo server is actually running...');
      
      // Test if localhost:8081 is actually accessible
      fetch('http://localhost:8081')
        .then(response => {
          console.log('✅ Localhost:8081 is accessible via fetch:', response.status);
        })
        .catch(error => {
          console.error('❌ Localhost:8081 is NOT accessible via fetch:', error);
        });
    }
  };

  // Inject element selector directly into iframe
  const injectElementSelector = () => {
    if (!iframeRef.current?.contentWindow) return;

    try {
      const script = `
        (function() {
          if (window.__applaaSelector) return;
          
          let overlay = null;
          let isActive = false;
          
          function createOverlay() {
            overlay = document.createElement('div');
            overlay.style.cssText = \`
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              pointer-events: none; z-index: 999999; display: none;
              background: rgba(147, 51, 234, 0.15);
              border: 2px solid #9333ea; border-radius: 6px;
              box-shadow: 0 0 0 1px rgba(147, 51, 234, 0.3);
            \`;
            document.body.appendChild(overlay);
          }
          
          function highlightElement(el) {
            if (!overlay || !el) return;
            const rect = el.getBoundingClientRect();
            overlay.style.display = 'block';
            overlay.style.top = rect.top + 'px';
            overlay.style.left = rect.left + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
          }
          
          function hideOverlay() {
            if (overlay) overlay.style.display = 'none';
          }
          
          function handleMouseMove(e) {
            if (!isActive) return;
            e.preventDefault();
            highlightElement(e.target);
          }
          
          function handleClick(e) {
            if (!isActive) return;
            e.preventDefault();
            e.stopPropagation();
            
            const el = e.target;
            const rect = el.getBoundingClientRect();
            
            // Send element info to parent
            window.parent.postMessage({
              type: 'element-selected',
              element: {
                tagName: el.tagName.toLowerCase(),
                className: el.className || '',
                id: el.id || '',
                textContent: (el.textContent || '').substring(0, 100),
                position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                styles: {
                  backgroundColor: getComputedStyle(el).backgroundColor,
                  color: getComputedStyle(el).color,
                  fontSize: getComputedStyle(el).fontSize
                }
              }
            }, '*');
            
            deactivate();
          }
          
          function activate() {
            isActive = true;
            createOverlay();
            document.addEventListener('mousemove', handleMouseMove, true);
            document.addEventListener('click', handleClick, true);
            document.body.style.cursor = 'crosshair';
            document.body.style.userSelect = 'none';
            console.log('🎯 Element selector activated');
          }
          
          function deactivate() {
            isActive = false;
            hideOverlay();
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('click', handleClick, true);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            console.log('🎯 Element selector deactivated');
          }
          
          window.__applaaSelector = { activate, deactivate, isActive: () => isActive };
          
          // Notify parent that selector is ready
          window.parent.postMessage({ type: 'selector-ready' }, '*');
          console.log('🎯 Applaa element selector injected and ready');
        })();
      `;

      iframeRef.current.contentWindow.eval(script);
      console.log('✅ Element selector injected successfully');
    } catch (error) {
      console.error('❌ Failed to inject element selector:', error);
    }
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'selector-ready') {
        console.log('🎯 Element selector ready in iframe');
      } else if (event.data?.type === 'element-selected') {
        console.log('🎯 Element selected:', event.data.element);
        setIsElementSelectorActive(false);
        
        // Send to chat or handle selection
        // You can add your element selection handler here
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Toggle element selector
  const toggleElementSelector = () => {
    if (!iframeRef.current?.contentWindow) return;

    try {
      if (isElementSelectorActive) {
        iframeRef.current.contentWindow.eval('window.__applaaSelector?.deactivate()');
      } else {
        iframeRef.current.contentWindow.eval('window.__applaaSelector?.activate()');
      }
      setIsElementSelectorActive(!isElementSelectorActive);
    } catch (error) {
      console.error('Failed to toggle element selector:', error);
    }
  };

  // Force refresh iframe with cache bypass
  const refreshPreview = () => {
    if (iframeRef.current) {
      console.log('🔄 Force refreshing iframe with cache bypass...');
      const currentUrl = iframeRef.current.src;
      const urlWithTimestamp = currentUrl.includes('?') 
        ? `${currentUrl}&_t=${Date.now()}`
        : `${currentUrl}?_t=${Date.now()}`;
      
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = urlWithTimestamp;
          console.log('🔄 Iframe refreshed with URL:', urlWithTimestamp);
        }
      }, 100);
    }
  };

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
          {expoStatus.isRunning && (
            <Badge className="text-xs bg-green-500 hover:bg-green-600">
              <Zap className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Server Controls */}
          <div className="flex items-center gap-1 mr-2">
            {!expoStatus.isRunning ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={startExpoServer}
                      disabled={isStarting || !selectedAppId}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {isStarting ? 'Starting...' : 'Start'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Start Expo server with tunnel support</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopExpoServer}
                      disabled={isStopping}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      {isStopping ? 'Stopping...' : 'Stop'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Stop Expo server</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* QR Code Toggle */}
            {qrCodeDataUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showQrPanel ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowQrPanel(!showQrPanel)}
                    >
                      <QrCodeIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Toggle QR code for mobile testing</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Open in Browser */}
            {expoStatus.webUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(expoStatus.webUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Open in browser</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Device Presets */}
          <div className="flex items-center gap-1 mr-2">
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
          
          {/* Element Selector */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isElementSelectorActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleElementSelector}
                  disabled={!isReady}
                  className={isElementSelectorActive ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
                >
                  <MousePointerClick className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isElementSelectorActive ? 'Disable' : 'Enable'} Element Selection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Refresh */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPreview}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Refresh Preview</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Responsive Preview */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="bg-black rounded-2xl p-2 shadow-2xl transition-all duration-500 ease-out"
          style={{
            transform: `scale(${currentDevice.scale})`,
            transformOrigin: 'center center'
          }}
        >
          <div
            className="bg-white rounded-xl overflow-hidden relative"
            style={{
              width: currentDevice.width,
              height: currentDevice.height
            }}
          >
            {webUrl !== 'about:blank' ? (
              <iframe
                ref={iframeRef}
                src={webUrl}
                className="w-full h-full border-0"
                title="Responsive App Preview"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">No Preview Available</h3>
                  <p className="text-sm">Start your Expo app to see the preview</p>
                </div>
              </div>
            )}
          </div>
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
