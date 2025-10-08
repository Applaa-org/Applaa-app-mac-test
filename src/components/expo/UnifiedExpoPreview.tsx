import React, { useState, useEffect, useRef } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { isStreamingAtom } from '@/atoms/chatAtoms';
import { isGamePopupOpenAtom } from '@/atoms/gamePopupAtom';
import { IpcClient } from '@/ipc/ipc_client';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import { Smartphone, RefreshCw, Play, Square, Globe, ExternalLink, Terminal, Monitor, Command, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetroRecoveryPanel } from './MetroRecoveryPanel';
import { useMetroRecovery } from '../../hooks/useMetroRecovery';
import { useAutoErrorFix } from '@/hooks/useAutoErrorFix';
import { useRandomGame, GameOption } from '@/hooks/useRandomGame';
import { GamePopupWindow } from '@/components/GamePopupWindow';

export function UnifiedExpoPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [isRunning, setIsRunning] = useState(false);
  
  // 🚨 DYAD PATTERN: Use simple global streaming atom
  const isStreaming = useAtomValue(isStreamingAtom);
  
  // Game popup state
  const [isGamePopupOpen, setIsGamePopupOpen] = useAtom(isGamePopupOpenAtom);
  
  // Track if popup was opened for current streaming session to prevent multiple opens
  const popupOpenedForCurrentStream = useRef(false);
  
  // Random game selection
  const { currentGame } = useRandomGame();
  const [selectedGame, setSelectedGame] = useState<GameOption>(() => currentGame);
  
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
  
  // Node.js tools diagnostics
  const [nodeToolsStatus, setNodeToolsStatus] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Metro recovery hook
  const {
    showRecoveryPanel,
    hasPortConflict,
    hasHangingProcess,
    hideRecoveryPanel,
    forceShowRecoveryPanel
  } = useMetroRecovery();

  // 🚨 SIMPLE: Auto-fix hook for Expo dependency errors (once per app)
  const { detectConsoleErrors } = useAutoErrorFix({ 
    enabled: true 
  });

  // Update selectedGame only when currentGame actually changes
  useEffect(() => {
    setSelectedGame(currentGame);
  }, [currentGame]);

  // Show game popup immediately when streaming starts (only once per session)
  useEffect(() => {
    if (isStreaming && !isGamePopupOpen && !popupOpenedForCurrentStream.current) {
      setIsGamePopupOpen(true);
      popupOpenedForCurrentStream.current = true;
    }
    
    // Reset the flag when streaming stops
    if (!isStreaming) {
      popupOpenedForCurrentStream.current = false;
    }
  }, [isStreaming, isGamePopupOpen]);

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

  // Check Node.js tools availability
  const checkNodeTools = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.simpleExpoCheckTools();
      setNodeToolsStatus(result);
      console.log('🔧 Node.js tools status:', result);
    } catch (error: any) {
      console.error('❌ Failed to check Node.js tools:', error);
      
      // Check if this is an "Invalid channel" error (IPC not ready yet)
      if (error?.message?.includes('Invalid channel')) {
        console.log('⏳ IPC handlers not ready yet, will retry...');
        // Retry after a short delay to allow IPC handlers to register
        setTimeout(() => {
          checkNodeTools();
        }, 500);
        return;
      }
      
      // Fallback: Set a default status when IPC handler is not available
      setNodeToolsStatus({ 
        success: false, 
        error: 'IPC handler not available - this is normal in development',
        availability: {
          node: true,
          npm: true, 
          npx: true,
          expo: false,
          paths: {
            node: 'system',
            npm: 'system',
            npx: 'system', 
            expo: 'not-installed'
          }
        }
      });
    }
  };

  // Node.js diagnostics check on mount (with delay to ensure IPC is ready)
  useEffect(() => {
    // Add small delay to ensure IPC handlers are registered
    const timer = setTimeout(() => {
      checkNodeTools();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 🚨 SIMPLE: Auto-detect Expo dependency errors from terminal output (ONCE per app)
  // This will auto-post to chat once per app to help non-technical users
  useEffect(() => {
    if (terminalOutput && selectedAppId) {
      detectConsoleErrors(terminalOutput);
    }
  }, [terminalOutput, selectedAppId, detectConsoleErrors]);

  // 🚨 REMOVED: Auto-start Expo preview logic (user requested manual control)
  // User: "lets make the Expo Preview for a Newly created app show a Preview button 
  //        not make that auto sync with chat if that is causing the issue"
  
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

  // Check Node.js tools on mount
  useEffect(() => {
    checkNodeTools();
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
          
          {/* Node.js Tools Diagnostics */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">System Status</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs"
              >
                {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
              </Button>
            </div>
            
            {showDiagnostics && nodeToolsStatus && (
              <div className="bg-white p-3 rounded border text-xs">
                {nodeToolsStatus.success ? (
                  <div>
                    <div className="mb-2 font-medium">Node.js Tools:</div>
                    {Object.entries(nodeToolsStatus.availability).map(([tool, available]) => {
                      if (tool === 'paths') return null;
                      return (
                        <div key={tool} className="flex justify-between items-center py-1">
                          <span className="capitalize">{tool}:</span>
                          <span className={available ? 'text-green-600' : 'text-red-600'}>
                            {available ? '✅' : '❌'}
                          </span>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkNodeTools}
                      className="mt-2 w-full text-xs"
                    >
                      Refresh Status
                    </Button>
                  </div>
                ) : (
                  <div className="text-red-600">
                    Error: {nodeToolsStatus.error}
                  </div>
                )}
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold mb-4">Device Testing</h3>
          
          {/* Status Indicator */}
          <div className="mb-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isRunning ? 'Expo preview ready!' : 'Preview not started'}
            </span>
          </div>
          
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
                  Scan with Expo Go app or Custom Dev Client
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
              <li>Install Expo Go from app store</li>
              <li>Open Expo Go app</li>
              <li>Scan the QR code above</li>
            </ol>
            
            {tunnelUrl && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <span className="text-blue-600">✅</span> Using tunnel - accessible from anywhere
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
                <span className="text-sm">Open in Browser</span>
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
                <span className="text-sm">Tunnel URL</span>
                <ExternalLink size={12} className="ml-auto" />
              </a>
            )}
          </div>
          
          {/* Metro Recovery Panel */}
          {showRecoveryPanel && (
            <div className="mt-4">
              <MetroRecoveryPanel 
                onRecoveryComplete={() => {
                  hideRecoveryPanel();
                  // Auto-restart Expo after successful recovery
                  if (!isRunning) {
                    setTimeout(() => {
                      startExpo();
                    }, 1000);
                  }
                }}
              />
            </div>
          )}
          
          {/* Manual Recovery Button (always available) */}
          {(hasPortConflict || hasHangingProcess) && !showRecoveryPanel && (
            <div className="mt-4">
              <Button 
                onClick={forceShowRecoveryPanel}
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                🚨 Metro Issues Detected - Show Recovery
              </Button>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="mt-6 space-y-2">
            {/* 🚨 REMOVED: isStreaming check - always show Preview button (user control) */}
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

      {/* Game Popup Window - Independent of preview reload */}
      <GamePopupWindow
        isOpen={isGamePopupOpen}
        onClose={() => setIsGamePopupOpen(false)}
        game={selectedGame}
        onGameChange={setSelectedGame}
      />
    </div>
  );
}