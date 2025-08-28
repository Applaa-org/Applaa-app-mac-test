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
  Globe,
  Terminal,
  Play,
  Square
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
  terminalOutput?: string;
  qrCodeText?: string;
}

export const SimpleTerminalPreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [autoStartState, setAutoStartState] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Generate QR code from URL
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

  // Parse terminal output for URLs and QR data
  const parseTerminalOutput = useCallback((output: string) => {
    const lines = output.split('\n');
    let webUrl = '';
    let qrUrl = '';
    let lanUrl = '';
    let tunnelUrl = '';
    
    for (const line of lines) {
      // Web URL patterns
      if (line.includes('Web is waiting on') || line.includes('localhost:')) {
        const webMatch = line.match(/https?:\/\/localhost:\d+/);
        if (webMatch) webUrl = webMatch[0];
      }
      
      // QR/LAN URL patterns  
      if (line.includes('Metro waiting on') || line.includes('exp://')) {
        const expMatch = line.match(/exp:\/\/[\d.]+:\d+/);
        if (expMatch) {
          qrUrl = expMatch[0];
          lanUrl = expMatch[0];
        }
      }
      
      // Tunnel URL patterns
      if (line.includes('exp.direct') || line.includes('tunnels.expo')) {
        const tunnelMatch = line.match(/https?:\/\/[a-zA-Z0-9-]+\.(exp\.direct|tunnels\.expo\.(dev|io))/);
        if (tunnelMatch) tunnelUrl = tunnelMatch[0];
      }
    }
    
    return { webUrl, qrUrl, lanUrl, tunnelUrl };
  }, []);

  // Start Expo server
  const startExpoServer = useCallback(async () => {
    if (!selectedAppId || isStarting) return;

    try {
      setIsStarting(true);
      setAutoStartState('starting');
      setStatusMessage('🚀 Starting Expo server...');
      setTerminalLogs(['🚀 Starting Expo server...']);
      
      console.log('🚀 Starting Expo for app:', selectedAppId);
      
      const ipcClient = IpcClient.getInstance();
      
      // Start Expo and get terminal output
      const result = await ipcClient.expoStart({ 
        appId: selectedAppId, 
        useTunnel: true,
        native: false, // Web mode for browser preview
      });
      
      console.log('📊 Expo start result:', result);
      
      if (result.isRunning || result.webUrl || result.tunnelUrl) {
        setExpoStatus(result);
        setAutoStartState('ready');
        setStatusMessage('✅ Expo server ready!');
        
        // Parse URLs from terminal output if available
        if (result.terminalOutput) {
          const parsedUrls = parseTerminalOutput(result.terminalOutput);
          console.log('📋 Parsed URLs from terminal:', parsedUrls);
          
          // Update status with parsed URLs
          setExpoStatus(prev => ({
            ...prev,
            ...parsedUrls
          }));
        }
        
        // Generate QR code for mobile testing
        const qrUrl = result.tunnelUrl || result.qrUrl || result.lanUrl;
        if (qrUrl) {
          console.log('🎯 Generating QR code for mobile access:', qrUrl);
          await generateQRCode(qrUrl);
          setShowQrPanel(true);
        }
        
        // Auto-open browser after a short delay
        setTimeout(() => {
          const webUrl = result.webUrl || result.tunnelUrl;
          if (webUrl) {
            console.log('🌐 Auto-opening browser:', webUrl);
            window.open(webUrl, '_blank');
          }
        }, 2000);
        
        console.log('✅ Auto-start completed successfully');
      } else {
        throw new Error('Expo failed to start - no URLs detected');
      }
    } catch (error) {
      console.error('❌ Auto-start failed:', error);
      setAutoStartState('error');
      setStatusMessage(`❌ Failed to start: ${error.message}`);
      setTerminalLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsStarting(false);
    }
  }, [selectedAppId, isStarting, generateQRCode, parseTerminalOutput]);

  // Stop Expo server
  const stopExpoServer = useCallback(async () => {
    if (isStopping) return;

    try {
      setIsStopping(true);
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      
      setExpoStatus({ isRunning: false });
      setAutoStartState('idle');
      setStatusMessage('');
      setQrCodeDataUrl('');
      setShowQrPanel(false);
      setTerminalLogs(['📴 Expo server stopped']);
    } catch (error) {
      console.error('❌ Failed to stop Expo server:', error);
    } finally {
      setIsStopping(false);
    }
  }, [isStopping]);

  // Auto-start when app is selected
  useEffect(() => {
    if (selectedAppId && autoStartState === 'idle') {
      console.log('🎯 App selected, triggering auto-start:', selectedAppId);
      startExpoServer();
    }
  }, [selectedAppId, autoStartState, startExpoServer]);

  // Poll Expo status for updates and terminal output
  useEffect(() => {
    if (!selectedAppId || autoStartState !== 'ready') return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.expoStatus();
        
        if (!status.isRunning) {
          setAutoStartState('error');
          setStatusMessage('❌ Expo server stopped unexpectedly');
        } else {
          setExpoStatus(status);
          
          // Check for new terminal output
          if (status.terminalOutput) {
            const parsedUrls = parseTerminalOutput(status.terminalOutput);
            setExpoStatus(prev => ({ ...prev, ...parsedUrls }));
            
            // Generate QR code if we got a new URL
            const qrUrl = parsedUrls.tunnelUrl || parsedUrls.qrUrl || parsedUrls.lanUrl;
            if (qrUrl && !qrCodeDataUrl) {
              await generateQRCode(qrUrl);
              setShowQrPanel(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll Expo status:', error);
      }
    };

    const interval = setInterval(pollExpoStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedAppId, autoStartState, qrCodeDataUrl, generateQRCode, parseTerminalOutput]);

  // Open in browser
  const openInBrowser = () => {
    const webUrl = expoStatus.webUrl || expoStatus.tunnelUrl;
    if (webUrl) {
      window.open(webUrl, '_blank');
      console.log('🌐 Opened in browser:', webUrl);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Controls Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-medium">
            <Terminal className="w-3 h-3 mr-1" />
            Terminal Mode
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
          
          {/* Open in Browser */}
          {autoStartState === 'ready' && (
            <Button variant="outline" size="sm" onClick={openInBrowser}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {autoStartState === 'starting' && (
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-blue-500" />
            <h3 className="text-lg font-medium">Starting Expo Server...</h3>
            <p className="text-sm text-gray-600">{statusMessage}</p>
            <div className="text-xs text-gray-500">
              📱 No iframe needed - just terminal parsing + browser opening!
            </div>
          </div>
        )}

        {autoStartState === 'ready' && (
          <div className="text-center space-y-6 max-w-2xl">
            {/* Success Status */}
            <div className="space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <h3 className="text-lg font-medium text-green-600">Expo Server Running!</h3>
              <p className="text-sm text-gray-600">
                Server started successfully. Browser should open automatically.
              </p>
            </div>
            
            {/* URLs Display */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border space-y-3">
              <h4 className="font-medium text-sm">Available URLs:</h4>
              
              {expoStatus.webUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">Web:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {expoStatus.webUrl}
                  </code>
                </div>
              )}
              
              {expoStatus.tunnelUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span className="text-gray-600">Tunnel:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {expoStatus.tunnelUrl}
                  </code>
                </div>
              )}
              
              {expoStatus.lanUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">Mobile:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {expoStatus.lanUrl}
                  </code>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button onClick={openInBrowser} className="bg-blue-500 hover:bg-blue-600">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Browser
              </Button>
              
              {qrCodeDataUrl && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowQrPanel(!showQrPanel)}
                >
                  <QrCodeIcon className="h-4 w-4 mr-2" />
                  {showQrPanel ? 'Hide' : 'Show'} QR Code
                </Button>
              )}
            </div>
            
            <p className="text-sm text-green-600">
              ✅ <strong>Simple & Reliable!</strong> No iframe complications.
            </p>
          </div>
        )}

        {autoStartState === 'error' && (
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
            <h3 className="text-lg font-medium text-red-600">Start Failed</h3>
            <p className="text-sm text-gray-600">{statusMessage}</p>
            <Button onClick={startExpoServer} className="bg-orange-500 hover:bg-orange-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {autoStartState === 'idle' && !selectedAppId && (
          <div className="text-center space-y-4">
            <Terminal className="h-16 w-16 mx-auto opacity-30" />
            <h3 className="text-lg font-medium">Select an App</h3>
            <p className="text-sm text-gray-600">
              Choose an app from the sidebar to start the Expo server
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




