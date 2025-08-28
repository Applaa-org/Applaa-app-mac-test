import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal, 
  Play, 
  Square, 
  Copy, 
  Trash2,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom, appOutputAtom } from '@/atoms/appAtoms';
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

interface SystemTerminalProps {
  isExpoApp: boolean;
}

export const SystemTerminal: React.FC<SystemTerminalProps> = ({ isExpoApp }) => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appOutput = useAtomValue(appOutputAtom);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  // Parse Expo URLs and generate QR code - DEFINE THIS SECOND
  const parseExpoUrls = useCallback(async (output: string) => {
    // Extract tunnel URL (priority for QR code)
    const tunnelMatch = output.match(/https?:\/\/[a-zA-Z0-9-]+\.(exp\.direct|tunnels\.expo\.(dev|io))/);
    const lanMatch = output.match(/exp:\/\/[\d.]+:\d+/);
    const webMatch = output.match(/https?:\/\/localhost:\d+/);

    const qrUrl = tunnelMatch?.[0] || lanMatch?.[0] || webMatch?.[0];
    
    if (qrUrl && qrUrl !== expoStatus.qrUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 128,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        setQrCodeDataUrl(qrDataUrl);
        setShowQrCode(true);
        
        // Add system message about QR code
        const qrOutput: TerminalOutput = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'system',
          content: `📱 QR Code generated for Expo Go: ${qrUrl}`
        };
        setTerminalOutput(prev => [...prev, qrOutput]);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }
  }, [expoStatus.qrUrl]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Convert app output to terminal format for web apps
  useEffect(() => {
    if (!isExpoApp && appOutput.length > 0) {
      const latestOutput = appOutput[appOutput.length - 1];
      if (latestOutput) {
        const newOutput: TerminalOutput = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'stdout',
          content: latestOutput.message
        };
        setTerminalOutput(prev => [...prev, newOutput]);
      }
    }
  }, [appOutput, isExpoApp]);

  // Listen for real terminal output
  useEffect(() => {
    if (!selectedAppId) return;

    const ipcClient = IpcClient.getInstance();
    
    // Set up listener for terminal output
    const handleTerminalOutput = (event: any, data: {
      appId: number;
      type: 'command' | 'stdout' | 'stderr' | 'system';
      content: string;
      timestamp: string;
    }) => {
      if (data.appId === selectedAppId) {
        const newOutput: TerminalOutput = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: data.type,
          content: data.content
        };
        setTerminalOutput(prev => [...prev, newOutput]);
        
        // Parse URLs and generate QR codes from real output
        if (data.type === 'stdout' && data.content) {
          parseExpoUrls(data.content);
        }
      }
    };

    // Add event listener (this assumes the IPC client has an event listener setup)
    if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('terminal:output', handleTerminalOutput);
      
      return () => {
        window.electron.ipcRenderer.removeListener('terminal:output', handleTerminalOutput);
      };
    }
  }, [selectedAppId, parseExpoUrls]);

  // Process raw terminal output from Expo - DEFINE THIS THIRD
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
      parseExpoUrls(rawOutput);
    }
  }, [parseExpoUrls]);

  // Poll Expo status for Expo apps
  useEffect(() => {
    if (!selectedAppId || !isExpoApp) return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
        setExpoStatus(status);

        // Process terminal output if available
        if (status.terminalOutput && status.terminalOutput !== expoStatus.terminalOutput) {
          processTerminalOutput(status.terminalOutput);
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
  }, [selectedAppId, isExpoApp, expoStatus.terminalOutput, processTerminalOutput]);





  // Execute command using REAL terminal execution
  const runCommand = useCallback(async (command: string) => {
    if (!selectedAppId || !command.trim()) return;

    setIsRunning(true);

    try {
      const ipcClient = IpcClient.getInstance();
      
      // Use real terminal execution for ALL commands
      const result = await ipcClient.executeTerminalCommand({
        appId: selectedAppId,
        command: command.trim()
      });

      if (result.success) {
        console.log(`✅ Terminal command started with PID: ${result.pid}`);
      } else {
        const errorOutput: TerminalOutput = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'stderr',
          content: '❌ Failed to start command'
        };
        setTerminalOutput(prev => [...prev, errorOutput]);
      }
    } catch (error) {
      const errorOutput: TerminalOutput = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'stderr',
        content: `❌ Error: ${error.message}`
      };
      setTerminalOutput(prev => [...prev, errorOutput]);
    } finally {
      setIsRunning(false);
    }
  }, [selectedAppId]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      runCommand(currentCommand);
      setCurrentCommand('');
    }
  };

  // Stop terminal process
  const stopTerminal = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.stopTerminal({ appId: selectedAppId });
      setExpoStatus({ isRunning: false });
      setQrCodeDataUrl('');
      setShowQrCode(false);
    } catch (error) {
      const errorOutput: TerminalOutput = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'stderr',
        content: `❌ Failed to stop terminal: ${error.message}`
      };
      setTerminalOutput(prev => [...prev, errorOutput]);
    }
  }, [selectedAppId]);

  // Clear terminal
  const clearTerminal = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.clearTerminal({ appId: selectedAppId });
      setTerminalOutput([]);
    } catch (error) {
      console.error('Failed to clear terminal:', error);
      // Fallback to local clear
      setTerminalOutput([]);
      const clearOutput: TerminalOutput = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'system',
        content: 'Terminal cleared'
      };
      setTerminalOutput(prev => [...prev, clearOutput]);
    }
  };

  // Copy terminal output
  const copyOutput = () => {
    const text = terminalOutput.map(line => 
      `[${line.timestamp.toLocaleTimeString()}] ${line.content}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    const copyOutput: TerminalOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'system',
      content: '📋 Terminal output copied to clipboard'
    };
    setTerminalOutput(prev => [...prev, copyOutput]);
  };

  // Open URL in browser
  const openUrl = (url: string) => {
    window.open(url, '_blank');
    const urlOutput: TerminalOutput = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'system',
      content: `🌐 Opened ${url} in browser`
    };
    setTerminalOutput(prev => [...prev, urlOutput]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-green-400 font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3" />
          <span className="text-xs font-medium text-white">
            {isExpoApp ? 'Expo Terminal' : 'App Terminal'}
          </span>
          {selectedAppId && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              #{selectedAppId}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Quick Actions for Expo */}
          {isExpoApp && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runCommand('npm run web')}
                disabled={isRunning}
                className="h-5 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                <Play className="h-2 w-2 mr-1" />
                Start
              </Button>
              
              {expoStatus.isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopTerminal}
                  className="h-5 px-2 text-xs border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <Square className="h-2 w-2 mr-1" />
                  Stop
                </Button>
              )}
            </>
          )}
          
          {/* QR Code Toggle */}
          {qrCodeDataUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrCode(!showQrCode)}
              className="h-5 px-2 text-xs"
            >
              <QrCode className="h-2 w-2 mr-1" />
              QR
            </Button>
          )}
          
          {/* Utility buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyOutput}
            className="h-5 w-5 p-0"
          >
            <Copy className="h-2 w-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="h-5 w-5 p-0"
          >
            <Trash2 className="h-2 w-2" />
          </Button>
        </div>
      </div>

      {/* QR Code Display */}
      {showQrCode && qrCodeDataUrl && (
        <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
          <div className="bg-white p-1 rounded">
            <img
              src={qrCodeDataUrl}
              alt="QR Code"
              className="w-12 h-12"
            />
          </div>
          <div className="flex-1 text-xs">
            <div className="text-white font-medium">Scan with Expo Go</div>
            <div className="text-gray-400">Open Camera app and scan QR code</div>
            {expoStatus.tunnelUrl && (
              <button
                onClick={() => openUrl(expoStatus.tunnelUrl!)}
                className="text-purple-400 hover:text-purple-300 underline text-xs"
              >
                {expoStatus.tunnelUrl}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0"
      >
        {terminalOutput.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            <Terminal className="h-4 w-4 mx-auto mb-1 opacity-50" />
            <p className="text-xs">
              {isExpoApp ? 'Ready for Expo commands. Try: npm run web' : 'System messages will appear here'}
            </p>
          </div>
        ) : (
          terminalOutput.map((line) => (
            <div key={line.id} className="flex gap-2 text-xs">
              <span className="text-gray-500 shrink-0 w-16 text-xs">
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
          <div className="flex items-center gap-2 text-yellow-400 text-xs">
            <div className="animate-spin h-2 w-2 border border-yellow-400 border-t-transparent rounded-full"></div>
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Command Input - Only for Expo apps */}
      {isExpoApp && (
        <div className="p-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-xs">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="npm run web"
              disabled={isRunning}
              className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-gray-500 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};
