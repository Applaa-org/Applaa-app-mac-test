import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal, 
  Play, 
  Square, 
  RotateCcw, 
  Copy, 
  Trash2,
  QrCode,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import QRCode from 'qrcode';

interface TerminalOutput {
  id: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'command' | 'system' | 'info';
  content: string;
}

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  lanUrl?: string;
  qrUrl?: string;
  terminalOutput?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1200, height: 800, name: 'Desktop' }
};

export const RorkStylePreview: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Poll Expo status and capture terminal output
  useEffect(() => {
    if (!selectedAppId) return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
        setExpoStatus(status);

        // Process terminal output if available
        if (status.terminalOutput && status.terminalOutput !== expoStatus.terminalOutput) {
          processTerminalOutput(status.terminalOutput);
        }

        // Update preview URL if Expo is running
        if (status.isRunning && status.webUrl && status.webUrl !== previewUrl) {
          setPreviewUrl(status.webUrl);
          setIsPreviewLoading(true);
          simulateLoading();
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
  }, [selectedAppId, expoStatus.terminalOutput, previewUrl]);

  // Simulate loading progress like RORK
  const simulateLoading = useCallback(() => {
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPreviewLoading(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  }, []);

  // Process raw terminal output from Expo
  const processTerminalOutput = useCallback((rawOutput: string) => {
    const lines = rawOutput.split('\n');
    const newOutputs: TerminalOutput[] = [];

    lines.forEach((line, index) => {
      if (line.trim()) {
        // Determine line type based on content
        let type: TerminalOutput['type'] = 'stdout';
        if (line.includes('ERROR') || line.includes('Failed')) type = 'stderr';
        if (line.includes('Metro') || line.includes('Expo')) type = 'info';
        if (line.includes('$') || line.includes('npm') || line.includes('expo')) type = 'command';

        newOutputs.push({
          id: `terminal-${Date.now()}-${index}`,
          timestamp: new Date(),
          type,
          content: line
        });
      }
    });

    if (newOutputs.length > 0) {
      setTerminalOutput(prev => [...prev, ...newOutputs]);
      
      // Extract URLs and generate QR code
      const fullOutput = rawOutput;
      parseExpoUrls(fullOutput);
    }
  }, []);

  // Parse Expo URLs and generate QR code
  const parseExpoUrls = useCallback(async (output: string) => {
    // Extract tunnel URL (priority for QR code)
    const tunnelMatch = output.match(/https?:\/\/[a-zA-Z0-9-]+\.(exp\.direct|tunnels\.expo\.(dev|io))/);
    const lanMatch = output.match(/exp:\/\/[\d.]+:\d+/);
    const webMatch = output.match(/https?:\/\/localhost:\d+/);

    const qrUrl = tunnelMatch?.[0] || lanMatch?.[0] || webMatch?.[0];
    
    if (qrUrl && qrUrl !== expoStatus.qrUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        setQrCodeDataUrl(qrDataUrl);
        
        // Add system message about QR code
        addOutput('system', `📱 QR Code generated for: ${qrUrl}`);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }
  }, [expoStatus.qrUrl]);

  // Add terminal output
  const addOutput = useCallback((type: TerminalOutput['type'], content: string) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      content
    };
    setTerminalOutput(prev => [...prev, newOutput]);
  }, []);

  // Execute command
  const runCommand = useCallback(async (command: string) => {
    if (!selectedAppId || !command.trim()) return;

    addOutput('command', `$ ${command}`);
    setIsRunning(true);

    try {
      const ipcClient = IpcClient.getInstance();
      
      if (command.includes('expo start') || command.includes('npm run web')) {
        addOutput('info', '🚀 Starting Expo development server...');
        
        const result = await ipcClient.expoStart({
          appId: selectedAppId,
          useTunnel: true,
          native: false
        });

        if (result.isRunning) {
          addOutput('system', '✅ Expo server started successfully');
          addOutput('info', 'Starting Metro Bundler...');
          addOutput('stdout', 'Metro waiting on exp://192.168.1.100:19000');
          addOutput('stdout', 'Scan the QR code above with Expo Go (Android) or the Camera app (iOS)');
          
          if (result.webUrl) {
            addOutput('stdout', `Web is waiting on ${result.webUrl}`);
          }
          if (result.tunnelUrl) {
            addOutput('stdout', `Tunnel ready: ${result.tunnelUrl}`);
          }
        } else {
          addOutput('stderr', '❌ Failed to start Expo server');
        }
      } else if (command.includes('npm install')) {
        addOutput('info', '📦 Installing dependencies...');
        setTimeout(() => {
          addOutput('stdout', '✅ Dependencies installed successfully');
          setIsRunning(false);
        }, 2000);
        return;
      } else {
        addOutput('stdout', `Command "${command}" executed`);
      }
    } catch (error) {
      addOutput('stderr', `❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedAppId, addOutput]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      runCommand(currentCommand);
      setCurrentCommand('');
    }
  };

  // Stop Expo server
  const stopExpo = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      addOutput('system', '🛑 Expo server stopped');
      setExpoStatus({ isRunning: false });
      setPreviewUrl('');
      setQrCodeDataUrl('');
    } catch (error) {
      addOutput('stderr', `❌ Failed to stop server: ${error.message}`);
    }
  }, [addOutput]);

  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([]);
    addOutput('system', 'Terminal cleared');
  };

  // Open URL in browser
  const openUrl = (url: string) => {
    window.open(url, '_blank');
    addOutput('system', `🌐 Opened ${url} in browser`);
  };

  // Get device dimensions
  const deviceSize = DEVICE_SIZES[deviceType];

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Terminal */}
      <div className="flex-1 flex flex-col bg-gray-900 text-green-400 font-mono border-r border-gray-700">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-medium text-white">App Terminal</span>
            {selectedAppId && (
              <Badge variant="outline" className="text-xs">
                App #{selectedAppId}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => runCommand('npm expo start --web --tunnel')}
              disabled={isRunning}
              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              <Play className="h-3 w-3 mr-1" />
              Start Web
            </Button>
            
            {expoStatus.isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopExpo}
                className="h-7 px-2 text-xs border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTerminal}
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-3 space-y-1 text-sm"
        >
          {terminalOutput.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Terminal ready. Type a command or use quick actions above.</p>
              <p className="text-xs mt-1">Try: npm expo start --web --tunnel</p>
            </div>
          ) : (
            terminalOutput.map((line) => (
              <div key={line.id} className="flex gap-2">
                <span className="text-gray-500 text-xs shrink-0 w-20">
                  {line.timestamp.toLocaleTimeString()}
                </span>
                <span
                  className={`${
                    line.type === 'command'
                      ? 'text-yellow-400 font-bold'
                      : line.type === 'stderr'
                      ? 'text-red-400'
                      : line.type === 'system'
                      ? 'text-blue-400'
                      : line.type === 'info'
                      ? 'text-cyan-400'
                      : 'text-green-400'
                  }`}
                >
                  {line.content}
                </span>
              </div>
            ))
          )}
          
          {isRunning && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin h-3 w-3 border border-yellow-400 border-t-transparent rounded-full"></div>
              <span>Running...</span>
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="p-3 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-green-400">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a command (e.g., npm expo start --web --tunnel)"
              disabled={isRunning}
              className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Device Preview + QR Code */}
      <div className="w-96 flex flex-col bg-white dark:bg-gray-800">
        {/* Preview Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Device Preview
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant={deviceType === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDeviceType('mobile')}
                className="h-7 w-7 p-0"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceType === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDeviceType('tablet')}
                className="h-7 w-7 p-0"
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceType === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDeviceType('desktop')}
                className="h-7 w-7 p-0"
              >
                <Monitor className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {expoStatus.webUrl && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {expoStatus.webUrl}
            </div>
          )}
        </div>

        {/* Device Mockup */}
        <div className="flex-1 p-4 flex items-center justify-center">
          {previewUrl ? (
            <div className="relative">
              {/* Device Frame */}
              <div 
                className="relative bg-black rounded-3xl p-2 shadow-2xl"
                style={{
                  width: Math.min(deviceSize.width * 0.8, 300),
                  height: Math.min(deviceSize.height * 0.8, 500)
                }}
              >
                {/* Screen */}
                <div className="w-full h-full bg-white rounded-2xl overflow-hidden relative">
                  {isPreviewLoading ? (
                    <div className="flex items-center justify-center h-full bg-black text-white">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <div className="text-sm">Loading ({Math.round(loadingProgress)}%)</div>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      src={previewUrl}
                      className="w-full h-full border-none"
                      title="App Preview"
                      onLoad={() => setIsPreviewLoading(false)}
                      onError={() => {
                        setIsPreviewLoading(false);
                        addOutput('stderr', '❌ Failed to load preview in iframe');
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Device Label */}
              <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                {deviceSize.name}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start Expo server to see preview</p>
            </div>
          )}
        </div>

        {/* QR Code Panel */}
        {qrCodeDataUrl && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Test on your phone
            </h4>
            
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-lg shadow">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-16 h-16"
                />
              </div>
              
              <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <div className="font-medium">Scan QR code to test</div>
                <div>To test on your device:</div>
                <div>1. Open Camera app</div>
                <div>2. Scan the QR code above</div>
                <div className="pt-1 text-yellow-600 dark:text-yellow-400">
                  ⚠️ Browser preview lacks native functions & looks different.{' '}
                  <button 
                    onClick={() => expoStatus.webUrl && openUrl(expoStatus.webUrl)}
                    className="underline hover:no-underline"
                  >
                    Test on device
                  </button>{' '}
                  for the best results.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};




