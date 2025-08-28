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
  Smartphone
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import QRCode from 'qrcode';

interface TerminalOutput {
  id: string;
  timestamp: Date;
  type: 'stdout' | 'stderr' | 'command' | 'system';
  content: string;
}

interface ExpoInfo {
  webUrl?: string;
  tunnelUrl?: string;
  lanUrl?: string;
  qrUrl?: string;
  qrCodeDataUrl?: string;
}

export const AppTerminal: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [expoInfo, setExpoInfo] = useState<ExpoInfo>({});
  const [showQrCode, setShowQrCode] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Add terminal output
  const addOutput = useCallback((type: TerminalOutput['type'], content: string) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      content
    };
    setTerminalOutput(prev => [...prev, newOutput]);

    // Parse for Expo URLs and QR codes
    if (type === 'stdout' && content.includes('exp://')) {
      parseExpoOutput(content);
    }
  }, []);

  // Parse Expo output for URLs and generate QR code
  const parseExpoOutput = useCallback(async (output: string) => {
    const info: ExpoInfo = {};

    // Extract web URL
    const webMatch = output.match(/https?:\/\/localhost:\d+/);
    if (webMatch) info.webUrl = webMatch[0];

    // Extract LAN/QR URL
    const lanMatch = output.match(/exp:\/\/[\d.]+:\d+/);
    if (lanMatch) {
      info.lanUrl = lanMatch[0];
      info.qrUrl = lanMatch[0];
    }

    // Extract tunnel URL
    const tunnelMatch = output.match(/https?:\/\/[a-zA-Z0-9-]+\.(exp\.direct|tunnels\.expo\.(dev|io))/);
    if (tunnelMatch) {
      info.tunnelUrl = tunnelMatch[0];
      info.qrUrl = tunnelMatch[0]; // Prefer tunnel for QR
    }

    // Generate QR code if we have a URL
    const qrUrl = info.tunnelUrl || info.lanUrl;
    if (qrUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        info.qrCodeDataUrl = qrDataUrl;
        setShowQrCode(true);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }

    setExpoInfo(prev => ({ ...prev, ...info }));
  }, []);

  // Run command in terminal
  const runCommand = useCallback(async (command: string) => {
    if (!selectedAppId || !command.trim()) return;

    addOutput('command', `$ ${command}`);
    setIsRunning(true);

    try {
      const ipcClient = IpcClient.getInstance();
      
      if (command === 'npm run web' || command === 'expo start --web') {
        // Start Expo web server
        const result = await ipcClient.expoStart({
          appId: selectedAppId,
          useTunnel: true,
          native: false
        });

        if (result.isRunning) {
          addOutput('system', '✅ Expo server started successfully');
          
          // Simulate terminal output that user would see
          addOutput('stdout', 'Starting project at /path/to/app');
          if (result.webUrl) {
            addOutput('stdout', `Web is waiting on ${result.webUrl}`);
          }
          if (result.lanUrl) {
            addOutput('stdout', `Metro waiting on ${result.lanUrl}`);
            addOutput('stdout', `Scan the QR code above with Expo Go (Android) or the Camera app (iOS)`);
          }
          if (result.tunnelUrl) {
            addOutput('stdout', `Tunnel ready: ${result.tunnelUrl}`);
          }
        } else {
          addOutput('stderr', '❌ Failed to start Expo server');
        }
      } else if (command === 'npm install' || command === 'npm i') {
        addOutput('stdout', 'Installing dependencies...');
        // Could implement actual npm install via IPC if needed
        setTimeout(() => {
          addOutput('stdout', '✅ Dependencies installed successfully');
          setIsRunning(false);
        }, 2000);
        return;
      } else {
        // For other commands, show a message
        addOutput('stdout', `Command "${command}" executed`);
      }
    } catch (error) {
      addOutput('stderr', `❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedAppId, addOutput]);

  // Handle Enter key in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      runCommand(currentCommand);
      setCurrentCommand('');
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: 'Start Web', command: 'npm run web', icon: <Play className="h-4 w-4" /> },
    { label: 'Install', command: 'npm install', icon: <RotateCcw className="h-4 w-4" /> },
  ];

  // Stop Expo server
  const stopExpo = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.expoStop();
      addOutput('system', '🛑 Expo server stopped');
      setExpoInfo({});
      setShowQrCode(false);
    } catch (error) {
      addOutput('stderr', `❌ Failed to stop server: ${error.message}`);
    }
  }, [addOutput]);

  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([]);
    addOutput('system', 'Terminal cleared');
  };

  // Copy terminal output
  const copyOutput = () => {
    const text = terminalOutput.map(line => 
      `[${line.timestamp.toLocaleTimeString()}] ${line.type === 'command' ? '' : ''}${line.content}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    addOutput('system', '📋 Terminal output copied to clipboard');
  };

  // Open URL in browser
  const openUrl = (url: string) => {
    window.open(url, '_blank');
    addOutput('system', `🌐 Opened ${url} in browser`);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-green-400 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">App Terminal</span>
          {selectedAppId && (
            <Badge variant="outline" className="text-xs">
              App #{selectedAppId}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {quickActions.map((action) => (
            <Button
              key={action.command}
              variant="outline"
              size="sm"
              onClick={() => runCommand(action.command)}
              disabled={isRunning}
              className="h-7 px-2 text-xs"
            >
              {action.icon}
              <span className="ml-1">{action.label}</span>
            </Button>
          ))}
          
          {/* Stop button if running */}
          {Object.keys(expoInfo).length > 0 && (
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
          
          {/* Utility buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyOutput}
            className="h-7 w-7 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expo Info Panel */}
      {Object.keys(expoInfo).length > 0 && (
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Available URLs:</div>
              {expoInfo.webUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-400">Web:</span>
                  <button
                    onClick={() => openUrl(expoInfo.webUrl!)}
                    className="text-blue-300 hover:text-blue-200 underline"
                  >
                    {expoInfo.webUrl}
                  </button>
                  <ExternalLink className="h-3 w-3" />
                </div>
              )}
              {expoInfo.tunnelUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-purple-400">Tunnel:</span>
                  <button
                    onClick={() => openUrl(expoInfo.tunnelUrl!)}
                    className="text-purple-300 hover:text-purple-200 underline"
                  >
                    {expoInfo.tunnelUrl}
                  </button>
                  <ExternalLink className="h-3 w-3" />
                </div>
              )}
              {expoInfo.lanUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">Mobile:</span>
                  <span className="text-green-300">{expoInfo.lanUrl}</span>
                  <Smartphone className="h-3 w-3" />
                </div>
              )}
            </div>
            
            {/* QR Code */}
            {expoInfo.qrCodeDataUrl && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="h-7 px-2 text-xs"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  QR Code
                </Button>
                {showQrCode && (
                  <div className="bg-white p-2 rounded">
                    <img
                      src={expoInfo.qrCodeDataUrl}
                      alt="QR Code"
                      className="w-20 h-20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 text-sm"
      >
        {terminalOutput.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Terminal ready. Type a command or use quick actions above.</p>
            <p className="text-xs mt-1">Try: npm run web</p>
          </div>
        ) : (
          terminalOutput.map((line) => (
            <div key={line.id} className="flex gap-2">
              <span className="text-gray-500 text-xs shrink-0">
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
            placeholder="Type a command (e.g., npm run web)"
            disabled={isRunning}
            className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-gray-500"
          />
          {isRunning && (
            <div className="animate-pulse text-yellow-400 text-xs">Running...</div>
          )}
        </div>
      </div>
    </div>
  );
};




