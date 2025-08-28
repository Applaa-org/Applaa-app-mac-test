import React, { useState, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import { Smartphone, RefreshCw, Play, Square, Globe, ExternalLink, Terminal, Monitor, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UnifiedExpoPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [isRunning, setIsRunning] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [webUrl, setWebUrl] = useState<string>('');
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [lanUrl, setLanUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [terminalHeight, setTerminalHeight] = useState<number>(256); // px
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(256);

  // Generate QR code from URL
  const generateQRCode = async (url: string) => {
    try {
      const options: QRCodeToDataURLOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };
      const qrDataUrl = await QRCode.toDataURL(url, options);
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('❌ QR Code generation failed:', error);
    }
  };

  // Start polling for Expo status updates
  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      if (!selectedAppId) return;
      
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.simpleExpoStatus();
        
        if (status) {
          // Update URLs
          if (status.webUrl && status.webUrl !== webUrl) {
            setWebUrl(status.webUrl);
          }
          if (status.tunnelUrl && status.tunnelUrl !== tunnelUrl) {
            setTunnelUrl(status.tunnelUrl);
          }
          if (status.lanUrl && status.lanUrl !== lanUrl) {
            setLanUrl(status.lanUrl);
          }
          
          // Update QR code with priority: qrUrl > tunnelUrl > lanUrl > webUrl (never localhost-if-tunnel)
          const preferUrl = status.qrUrl
            || status.tunnelUrl
            || (status.lanUrl?.startsWith('exp://') ? status.lanUrl : '')
            || (status.webUrl?.includes('localhost') && status.tunnelUrl ? '' : status.webUrl)
            || '';
          if (preferUrl && preferUrl !== qrCodeDataUrl) {
            generateQRCode(preferUrl);
          }
          
          // Update terminal output
          if (status.terminalOutput && status.terminalOutput !== terminalOutput) {
            setTerminalOutput(status.terminalOutput);
            // Auto-scroll terminal
            if (terminalRef.current) {
              terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
          }
          
          // Update running status
          setIsRunning(status.isRunning);
          if (status.isRunning) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('📊 Status polling error:', error);
      }
    }, 1500);
  };

  // Start Expo server
  const startExpo = async () => {
    if (!selectedAppId) return;
    
    setIsLoading(true);
    setTerminalOutput('🚀 Starting Expo development server...\n');
    
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.simpleExpoStart({ appId: selectedAppId, useTunnel: true });
      
      console.log('📊 Expo start result:', result);
      
      if (result && !(result as any).error) {
        setIsRunning(true);
        setTerminalOutput(prev => prev + '✅ Expo server starting...\n');
        startPolling();
      } else {
        setIsLoading(false);
        const errorMsg = (result as any)?.error || 'Unknown error';
        setTerminalOutput(prev => prev + `❌ Failed to start: ${errorMsg}\n`);
      }
    } catch (error) {
      console.error('💥 Expo start error:', error);
      setIsLoading(false);
      setTerminalOutput(prev => prev + `❌ Error: ${error}\n`);
    }
  };

  // Stop Expo server
  const stopExpo = async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.simpleExpoStop();
      
      setIsRunning(false);
      setIsLoading(false);
      setWebUrl('');
      setTunnelUrl('');
      setLanUrl('');
      setQrCodeDataUrl('');
      setTerminalOutput(prev => prev + '🛑 Expo server stopped\n');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (error) {
      console.error('💥 Expo stop error:', error);
      setTerminalOutput(prev => prev + `❌ Stop error: ${error}\n`);
    }
  };

  // Send keyboard input to Expo CLI
  const sendInput = async (input: string) => {
    if (!selectedAppId || !isRunning) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.simpleExpoInput(input);
      setTerminalOutput(prev => prev + `> ${input}\n`);
    } catch (error) {
      console.error('⌨️ Input error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Get best URL for iframe (web preview): prefer local web for performance, else tunnel, else LAN
  const getBestUrl = () => {
    if (webUrl) return webUrl; // web is localhost for iframe
    if (tunnelUrl) return tunnelUrl;
    if (lanUrl) return lanUrl;
    return '';
  };

  // Drag handlers for resizable terminal
  const onDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  };

  const onDragMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const delta = dragStartYRef.current - e.clientY; // dragging up increases terminal
    const next = Math.min(600, Math.max(140, startHeightRef.current + delta));
    setTerminalHeight(next);
  };

  const onDragEnd = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Main Content Area - RORK Style Layout */}
      <div className="flex-1 flex">
        {/* Left Side - Phone Mockup */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative">
            {/* Phone Frame */}
            <div className="w-[300px] h-[600px] bg-black rounded-[40px] p-3 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[28px] overflow-hidden relative">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-black rounded-t-[28px] flex items-center justify-between px-6 text-white text-sm">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 border border-white rounded-sm"></div>
                    <div className="w-6 h-2 bg-white rounded-sm"></div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="pt-8 h-full">
                  {getBestUrl() ? (
                    <iframe
                      ref={iframeRef}
                      src={getBestUrl()}
                      className="w-full h-full border-0"
                      title="Expo App Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Smartphone size={48} className="mb-4" />
                      <p className="text-center px-4">
                        {isRunning ? 'Loading app...' : 'Click Start Preview to begin'}
                      </p>
                      {!isRunning && (
                        <Button 
                          onClick={startExpo} 
                          disabled={isLoading}
                          className="mt-4"
                        >
                          <Play size={16} className="mr-2" />
                          {isLoading ? 'Starting...' : 'Start Preview'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - QR Code & Controls */}
        <div className="w-80 p-6 border-l border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Test on your phone</h3>
          
          {/* QR Code */}
          <div className="mb-6">
            {qrCodeDataUrl ? (
              <div className="text-center">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  className="mx-auto mb-3 border border-gray-300 rounded-lg"
                />
                <p className="text-sm text-gray-600">
                  Scan QR code to test
                </p>
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Command size={32} className="mx-auto mb-2" />
                  <p className="text-sm">QR code will appear here</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">Scan QR code to test</h4>
            <p className="text-sm text-gray-600 mb-2">To test on your device:</p>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
              <li>Open Camera app</li>
              <li>Scan the QR code above</li>
            </ol>
            
            {tunnelUrl && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                <span className="text-orange-600">⚠️</span> Browser preview lacks native functions & looks different. Test on device for the best results.
              </div>
            )}
          </div>
          
          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Links</h4>
            
            {webUrl && (
              <a 
                href={webUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <Globe size={16} />
                <span className="text-sm">Web</span>
                <ExternalLink size={12} className="ml-auto" />
              </a>
            )}
            
            {tunnelUrl && (
              <a 
                href={tunnelUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <Monitor size={16} />
                <span className="text-sm">Tunnel</span>
                <ExternalLink size={12} className="ml-auto" />
              </a>
            )}
          </div>
          
          {/* Control Buttons */}
          <div className="mt-6 space-y-2">
            {isRunning ? (
              <>
                <Button 
                  onClick={stopExpo} 
                  variant="destructive" 
                  className="w-full"
                >
                  <Square size={16} className="mr-2" />
                  Stop Preview
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => sendInput('w')} 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    w → web
                  </Button>
                  <Button 
                    onClick={() => sendInput('r')} 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    r → reload
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                onClick={startExpo} 
                disabled={isLoading} 
                className="w-full"
              >
                <Play size={16} className="mr-2" />
                {isLoading ? 'Starting...' : 'Start Preview'}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="h-2 cursor-row-resize bg-gray-200 hover:bg-gray-300 border-t border-gray-200"
        title="Drag to resize terminal"
      />

      {/* Bottom - Terminal */}
      <div className="border-t border-gray-200 bg-black text-green-400 font-mono text-sm" style={{height: terminalHeight}}>
        <div className="h-full flex flex-col">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
            <div className="flex items-center gap-2">
              <Terminal size={16} />
              <span>Expo CLI</span>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
          
          {/* Terminal Content */}
          <div 
            ref={terminalRef}
            className="flex-1 p-4 overflow-y-auto whitespace-pre-wrap"
          >
            {terminalOutput || '$ Ready to start Expo development server...\n'}
          </div>
        </div>
      </div>
    </div>
  );
}
