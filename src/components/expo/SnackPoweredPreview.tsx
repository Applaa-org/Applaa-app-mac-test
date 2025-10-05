/**
 * 🚀 Snack-Powered Preview Component
 * Uses Expo Snack SDK to provide the same preview experience as snack.expo.dev
 * 
 * Features:
 * - Automatic hot reload when files change
 * - Built-in error overlays (red box)
 * - Console log visibility
 * - Device frame options
 * - Real-time build status
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { Loader2, CheckCircle, AlertTriangle, Smartphone, Monitor, Tablet, RefreshCw, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';

// Snack SDK types
interface SnackFile {
  type: 'CODE' | 'ASSET';
  contents: string;
}

interface SnackFiles {
  [path: string]: SnackFile;
}

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string;
  error?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_FRAMES = {
  mobile: { width: 375, height: 667, label: 'iPhone SE', scale: 1 },
  tablet: { width: 768, height: 1024, label: 'iPad', scale: 0.8 },
  desktop: { width: 1200, height: 800, label: 'Desktop', scale: 0.7 }
};

export function SnackPoweredPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0);
  const [lastHotReload, setLastHotReload] = useState<number>(0);
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Start Expo server and get preview URL
   */
  const startExpoPreview = useCallback(async () => {
    if (!selectedAppId || isLoading) return;
    
    try {
      setIsLoading(true);
      console.log('🚀 Starting Snack-powered Expo preview for app:', selectedAppId);
      
      const ipcClient = IpcClient.getInstance();
      
      // Start Expo with tunnel support for mobile testing
      const result = await ipcClient.expoStart({
        appId: selectedAppId,
        useTunnel: true,
        native: false  // Use web mode for faster startup
      });
      
      console.log('📊 Expo start result:', result);
      
      if (result.isRunning && result.webUrl) {
        setPreviewUrl(result.webUrl);
        setExpoStatus(result);
        setConnectionStatus('connected');
        console.log('✅ Expo preview started successfully:', result.webUrl);
        
        // Generate QR code for mobile testing
        if (result.tunnelUrl || result.qrUrl) {
          await generateQRCode(result.tunnelUrl || result.qrUrl || '');
        }
      } else {
        throw new Error('Failed to start Expo server');
      }
    } catch (error) {
      console.error('❌ Failed to start Expo preview:', error);
      setConnectionStatus('disconnected');
      setExpoStatus(prev => ({
        ...prev,
        buildStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to start preview'
      }));
    } finally {
      setIsLoading(false);
    }
  }, [selectedAppId, isLoading]);
  
  /**
   * Generate QR code for mobile testing
   */
  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
      console.log('✅ QR code generated for:', url);
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
    }
  };
  
  /**
   * Check Expo status periodically
   */
  const checkExpoStatus = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
      
      // Update status
      setExpoStatus(status);
      setConnectionStatus(status.isRunning ? 'connected' : 'disconnected');
      
      // Check for hot reload events
      if (status.lastHotReload && status.lastHotReload > lastHotReload) {
        console.log('🔥 Hot reload detected! Refreshing preview...');
        setLastHotReload(status.lastHotReload);
        
        // Force iframe refresh to show changes
        setIframeKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error checking Expo status:', error);
      setConnectionStatus('disconnected');
    }
  }, [selectedAppId, lastHotReload]);
  
  /**
   * Manual refresh
   */
  const refreshPreview = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    setIframeKey(prev => prev + 1);
  }, []);
  
  /**
   * Stop Expo server
   */
  const stopExpoPreview = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop({ appId: selectedAppId });
      setPreviewUrl(null);
      setConnectionStatus('disconnected');
      console.log('🛑 Expo preview stopped');
    } catch (error) {
      console.error('Error stopping Expo:', error);
    }
  }, [selectedAppId]);
  
  // Auto-start preview when app is selected
  useEffect(() => {
    if (selectedAppId) {
      startExpoPreview();
    }
    
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [selectedAppId, startExpoPreview]);
  
  // Poll status every 2 seconds (like Snack)
  useEffect(() => {
    if (selectedAppId && expoStatus.isRunning) {
      statusCheckInterval.current = setInterval(checkExpoStatus, 2000);
      
      return () => {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
      };
    }
  }, [selectedAppId, expoStatus.isRunning, checkExpoStatus]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);
  
  if (!selectedAppId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Select an Expo app to start preview
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Powered by Expo Snack
          </p>
        </div>
      </div>
    );
  }
  
  const deviceFrame = DEVICE_FRAMES[deviceType];
  
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Top Status Bar - Snack Style */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Left: Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Build Status */}
          {expoStatus.buildStatus && (
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
              {expoStatus.buildStatus === 'building' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {expoStatus.buildProgress || 'Building...'}
                  </span>
                </>
              )}
              {expoStatus.buildStatus === 'success' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Ready
                  </span>
                </>
              )}
              {expoStatus.buildStatus === 'error' && (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Build Failed
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {expoStatus.webUrl && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open(expoStatus.webUrl, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open in Browser
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={refreshPreview}
            disabled={!previewUrl}
            className="text-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setShowQR(!showQR)}
            disabled={!qrCodeDataUrl}
            className="text-xs bg-blue-500 hover:bg-blue-600"
          >
            <QrCode className="w-4 h-4 mr-1" />
            QR Code
          </Button>
        </div>
      </div>
      
      {/* Device Type Selector */}
      <div className="flex items-center justify-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button
          variant={deviceType === 'mobile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('mobile')}
          className="text-xs"
        >
          <Smartphone className="w-4 h-4 mr-1" />
          Mobile
        </Button>
        <Button
          variant={deviceType === 'tablet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('tablet')}
          className="text-xs"
        >
          <Tablet className="w-4 h-4 mr-1" />
          Tablet
        </Button>
        <Button
          variant={deviceType === 'desktop' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('desktop')}
          className="text-xs"
        >
          <Monitor className="w-4 h-4 mr-1" />
          Desktop
        </Button>
      </div>
      
      {/* Preview Frame */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              Starting Expo preview...
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              This may take a moment on first start
            </p>
          </div>
        ) : previewUrl ? (
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-8 border-gray-800 dark:border-gray-600 relative"
            style={{
              width: deviceFrame.width,
              height: deviceFrame.height,
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `scale(${deviceFrame.scale})`,
              transformOrigin: 'center'
            }}
          >
            {/* Device Frame Header (for mobile/tablet) */}
            {(deviceType === 'mobile' || deviceType === 'tablet') && (
              <div className="absolute top-0 left-0 right-0 h-8 bg-gray-900 flex items-center justify-center z-10">
                <div className="w-16 h-1 bg-gray-700 rounded-full" />
              </div>
            )}
            
            {/* Preview Content */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Expo Snack Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="camera; microphone; geolocation; accelerometer; gyroscope"
            />
            
            {/* Device Label */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-900/80 text-white text-xs rounded-full backdrop-blur-sm">
              {deviceFrame.label}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              {expoStatus.error || 'Failed to start preview'}
            </p>
            <Button onClick={startExpoPreview} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      </div>
      
      {/* QR Code Modal */}
      {showQR && qrCodeDataUrl && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-2xl max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">
              Scan to Test on Device
            </h3>
            <div className="bg-white p-4 rounded-lg">
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
              {expoStatus.tunnelUrl || expoStatus.qrUrl || 'Scan with Expo Go app'}
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowQR(false)}
                className="flex-1"
              >
                Close
              </Button>
              {(expoStatus.tunnelUrl || expoStatus.qrUrl) && (
                <Button 
                  variant="default"
                  onClick={() => window.open(expoStatus.tunnelUrl || expoStatus.qrUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

