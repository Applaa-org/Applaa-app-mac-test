import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MousePointerClick, Smartphone, Tablet, Monitor, RotateCcw, Zap, QrCode as QrCodeIcon, Play, Square, ExternalLink } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode from 'qrcode';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';

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

export const NoIframeMobilePreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 NoIframeMobilePreview Debug:', {
      selectedAppId,
      expoStatus,
      deviceType
    });
  }, [selectedAppId, expoStatus, deviceType]);

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

  // Start Expo server
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId || isStarting) return;

    try {
      setIsStarting(true);
      console.log('🚀 Starting Expo server...');
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.expoStart({ 
        appId: selectedAppId, 
        useTunnel: true,
        native: true,
      });
      
      if (result.isRunning) {
        setExpoStatus(result);
        
        // Generate QR code
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          await generateQRCode(qrUrl);
          setShowQrPanel(true);
        }
        
        console.log('✅ Expo server started successfully');
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
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl('');
      setShowQrPanel(false);
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
        setExpoStatus(status);
        
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

    pollExpoStatus();
    const interval = setInterval(pollExpoStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId, qrCodeDataUrl, generateQRCode]);

  // Open in new window (NO IFRAME!)
  const openPreviewWindow = () => {
    if (expoStatus.webUrl) {
      const previewWindow = window.open(
        expoStatus.webUrl,
        'expo-preview',
        `width=${currentDevice.width},height=${currentDevice.height},resizable=yes,scrollbars=yes`
      );
      
      if (previewWindow) {
        // Style the popup window to look like a mobile device
        previewWindow.addEventListener('load', () => {
          const style = previewWindow.document.createElement('style');
          style.textContent = `
            body {
              margin: 0;
              padding: 0;
              background: #f0f0f0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            /* Mobile device simulation */
            html {
              width: ${currentDevice.width}px;
              height: ${currentDevice.height}px;
              overflow: hidden;
            }
            
            /* Add mobile viewport meta if not present */
            @media (max-width: 768px) {
              * {
                -webkit-text-size-adjust: 100%;
                -webkit-tap-highlight-color: transparent;
              }
            }
          `;
          previewWindow.document.head.appendChild(style);
        });
      }
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
          {!expoStatus.isRunning ? (
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
          ) : (
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

      {/* NO IFRAME - Direct Preview Options */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {expoStatus.isRunning && expoStatus.webUrl ? (
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
                  
                  {/* Preview placeholder */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Smartphone className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                      <h3 className="font-semibold text-gray-800 mb-2">Preview Ready!</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Your app is running at<br />
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {expoStatus.webUrl}
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
                  Open Preview Window
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open(expoStatus.webUrl, '_blank')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
              </div>
              
              <p className="text-sm text-gray-600">
                💡 <strong>No iframe issues!</strong> Opens in a properly sized window or browser tab.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Smartphone className="h-16 w-16 mx-auto opacity-30" />
              <h3 className="text-lg font-medium">No Preview Available</h3>
              <p className="text-sm text-gray-600">Start your Expo app to see the preview</p>
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





