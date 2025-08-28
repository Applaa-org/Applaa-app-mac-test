import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '../../atoms/appAtoms';
import { IpcClient } from '../../ipc/ipc_client';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';

interface ExpoStatus {
  isRunning: boolean;
  webUrl: string;
  lanUrl: string;
  tunnelUrl: string;
  qrUrl: string;
  terminalOutput?: string;
  lastHotReload?: number;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string;
}

interface PreviewHealth {
  healthy: boolean;
  reason: string;
  url?: string;
  responseTime?: number;
}

export const EnhancedExpoPreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // State management
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({
    isRunning: false,
    webUrl: '',
    lanUrl: '',
    tunnelUrl: '',
    qrUrl: '',
    buildStatus: 'idle'
  });
  
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(true);
  const [useTunnel, setUseTunnel] = useState(true); // Default to tunnel mode
  const [previewHealth, setPreviewHealth] = useState<PreviewHealth | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  
  // Refs for intervals
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);
  const autoStartTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Constants
  const MAX_RETRY_ATTEMPTS = 3;
  const HEALTH_CHECK_INTERVAL = 5000;
  const STATUS_POLL_INTERVAL = 2000;
  const AUTO_START_DELAY = 1000;

  // Generate QR code when QR URL is available
  useEffect(() => {
    if (expoStatus.qrUrl) {
      QRCode.toDataURL(expoStatus.qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl).catch(console.error);
    } else {
      setQrCodeDataUrl('');
    }
  }, [expoStatus.qrUrl]);

  // Health check function
  const checkPreviewHealth = useCallback(async () => {
    if (!expoStatus.isRunning || !expoStatus.webUrl) {
      setPreviewHealth(null);
      return;
    }

    try {
      const startTime = Date.now();
      const result = await IpcClient.getInstance().expoHealthCheck();
      const responseTime = Date.now() - startTime;
      
      setPreviewHealth({
        ...result,
        responseTime
      });
    } catch (error) {
      setPreviewHealth({
        healthy: false,
        reason: `Health check failed: ${error.message}`,
        responseTime: undefined
      });
    }
  }, [expoStatus.isRunning, expoStatus.webUrl]);

  // Status polling function
  const pollExpoStatus = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      const status = await IpcClient.getInstance().expoStatus();
      setExpoStatus(status);
      
      // Clear error if status is good
      if (status.isRunning && lastError) {
        setLastError('');
        setRetryCount(0);
      }
    } catch (error) {
      console.error('Failed to poll Expo status:', error);
    }
  }, [selectedAppId, lastError]);

  // Auto-start Expo when app is selected
  const autoStartExpo = useCallback(async () => {
    if (!selectedAppId || !autoStartEnabled || isStarting) return;

    // Clear any existing timeout
    if (autoStartTimeout.current) {
      clearTimeout(autoStartTimeout.current);
    }

    autoStartTimeout.current = setTimeout(async () => {
      try {
        await startExpoServer();
      } catch (error) {
        console.error('Auto-start failed:', error);
      }
    }, AUTO_START_DELAY);
  }, [selectedAppId, autoStartEnabled, isStarting]);

  // Start Expo server with enhanced error recovery
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId || isStarting) return;

    try {
      setIsStarting(true);
      setLastError('');
      
      const result = await IpcClient.getInstance().expoStart({
        appId: selectedAppId,
        useTunnel,
        native: false // Web mode for instant preview
      });

      setExpoStatus(result);
      
      if (result.isRunning) {
        // Start health monitoring
        if (healthCheckInterval.current) {
          clearInterval(healthCheckInterval.current);
        }
        healthCheckInterval.current = setInterval(checkPreviewHealth, HEALTH_CHECK_INTERVAL);
        
        setRetryCount(0);
      } else {
        throw new Error('Expo server failed to start');
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      setLastError(errorMessage);
      
      // Auto-retry with exponential backoff
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          startExpoServer();
        }, delay);
      }
    } finally {
      setIsStarting(false);
    }
  }, [selectedAppId, useTunnel, isStarting, retryCount, checkPreviewHealth]);

  // Stop Expo server
  const stopExpoServer = useCallback(async () => {
    if (isStopping) return;

    try {
      setIsStopping(true);
      await IpcClient.getInstance().expoStop();
      
      // Clear intervals
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
        healthCheckInterval.current = null;
      }
      
      setExpoStatus({
        isRunning: false,
        webUrl: '',
        lanUrl: '',
        tunnelUrl: '',
        qrUrl: '',
        buildStatus: 'idle'
      });
      setPreviewHealth(null);
      setRetryCount(0);
      setLastError('');
    } catch (error) {
      setLastError(`Failed to stop Expo: ${error.message}`);
    } finally {
      setIsStopping(false);
    }
  }, [isStopping]);

  // Restart Expo server
  const restartExpoServer = useCallback(async () => {
    await stopExpoServer();
    setTimeout(() => startExpoServer(), 1000);
  }, [stopExpoServer, startExpoServer]);

  // Auto-start when app is selected
  useEffect(() => {
    if (selectedAppId && autoStartEnabled) {
      autoStartExpo();
    }
    
    return () => {
      if (autoStartTimeout.current) {
        clearTimeout(autoStartTimeout.current);
      }
    };
  }, [selectedAppId, autoStartExpo, autoStartEnabled]);

  // Status polling
  useEffect(() => {
    if (selectedAppId) {
      // Initial poll
      pollExpoStatus();
      
      // Set up polling interval
      statusPollInterval.current = setInterval(pollExpoStatus, STATUS_POLL_INTERVAL);
    }
    
    return () => {
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
      }
    };
  }, [selectedAppId, pollExpoStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
      }
      if (autoStartTimeout.current) {
        clearTimeout(autoStartTimeout.current);
      }
    };
  }, []);

  // Get status badge variant
  const getStatusBadgeVariant = () => {
    if (!expoStatus.isRunning) return 'secondary';
    if (expoStatus.buildStatus === 'error') return 'destructive';
    if (expoStatus.buildStatus === 'building') return 'default';
    if (previewHealth?.healthy === false) return 'destructive';
    return 'default';
  };

  // Get status text
  const getStatusText = () => {
    if (isStarting) return 'Starting...';
    if (isStopping) return 'Stopping...';
    if (!expoStatus.isRunning) return 'Stopped';
    if (expoStatus.buildStatus === 'building') return 'Building...';
    if (expoStatus.buildStatus === 'error') return 'Build Error';
    if (previewHealth?.healthy === false) return 'Unhealthy';
    return 'Running';
  };

  if (!selectedAppId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Select an app to start preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Enhanced Expo Preview</CardTitle>
            <Badge variant={getStatusBadgeVariant()}>
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {!expoStatus.isRunning ? (
              <Button 
                onClick={startExpoServer} 
                disabled={isStarting}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isStarting ? 'Starting...' : 'Start Preview'}
              </Button>
            ) : (
              <Button 
                onClick={stopExpoServer} 
                disabled={isStopping}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                {isStopping ? 'Stopping...' : 'Stop Preview'}
              </Button>
            )}
            
            <Button 
              onClick={restartExpoServer} 
              disabled={isStarting || isStopping}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Restart
            </Button>
            
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useTunnel}
                  onChange={(e) => setUseTunnel(e.target.checked)}
                  className="rounded"
                />
                {useTunnel ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                Tunnel Mode
              </label>
            </div>
          </div>

          {/* Build Progress */}
          {expoStatus.buildStatus === 'building' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Building...</span>
              </div>
              <Progress value={undefined} className="h-2" />
              {expoStatus.buildProgress && (
                <p className="text-xs text-muted-foreground">{expoStatus.buildProgress}</p>
              )}
            </div>
          )}

          {/* Error Display */}
          {lastError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {lastError}
                {retryCount > 0 && ` (Retry ${retryCount}/${MAX_RETRY_ATTEMPTS})`}
              </AlertDescription>
            </Alert>
          )}

          {/* Health Status */}
          {previewHealth && (
            <div className="flex items-center gap-2 text-sm">
              {previewHealth.healthy ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span>{previewHealth.reason}</span>
              {previewHealth.responseTime && (
                <span className="text-muted-foreground">
                  ({previewHealth.responseTime}ms)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview URLs */}
      {expoStatus.isRunning && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Web Preview */}
          {expoStatus.webUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Web Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden">
                    <iframe
                      src={expoStatus.webUrl}
                      className="w-full h-full border-0"
                      title="Expo Web Preview"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(expoStatus.webUrl, '_blank')}
                    className="w-full flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Browser
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile QR Code */}
          {expoStatus.qrUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Mobile Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-center">
                  {qrCodeDataUrl && (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code for mobile preview"
                      className="mx-auto rounded-lg"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Scan with Expo Go app
                  </p>
                  <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {expoStatus.qrUrl}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

