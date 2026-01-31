/**
 * 🏖️ Sandbox Mobile Preview Component
 * True OS-independent preview using Metro bundler directly
 * 
 * Features:
 * - Metro bundler (direct, no Expo CLI)
 * - Web bundling with react-native-web
 * - Simple HTTP server for preview
 * - No tunnel dependencies
 * - Works identically on Windows/macOS/Linux
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, Terminal, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SandboxMetroStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  port?: number;
  httpPort?: number;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  error?: string;
  terminalOutput?: string;
}

type PreviewTab = 'android' | 'ios';

interface DeviceOption {
  id: string;
  name: string;
  width: number;
  height: number;
  platform: 'android' | 'ios';
}

const DEVICES: DeviceOption[] = [
  // Android devices
  { id: 'pixel8', name: 'Pixel 8', width: 412, height: 915, platform: 'android' },
  { id: 'pixel9pro', name: 'Pixel 9 Pro', width: 412, height: 892, platform: 'android' },
  { id: 'galaxytabs7', name: 'Galaxy Tab S7', width: 753, height: 1037, platform: 'android' },
  
  // iOS devices
  { id: 'iphone15pro', name: 'iPhone 15 Pro', width: 393, height: 852, platform: 'ios' },
  { id: 'iphone16pro', name: 'iPhone 16 Pro', width: 402, height: 874, platform: 'ios' },
  { id: 'ipadair', name: 'iPad Air', width: 820, height: 1180, platform: 'ios' },
];

export function SandboxMobilePreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  const [activeTab, setActiveTab] = useState<PreviewTab>('android');
  const [selectedDevice, setSelectedDevice] = useState<DeviceOption>(DEVICES.find(d => d.id === 'pixel8')!);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<SandboxMetroStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showTerminal, setShowTerminal] = useState(true);
  
  const hasStartedRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  /**
   * Start sandbox Metro bundler
   */
  const startSandboxMetro = useCallback(async () => {
    if (!selectedAppId) return;
    
    if (startingRef.current) {
      console.log('⏭️ Already starting, skipping');
      return;
    }
    
    if (hasStartedRef.current && previewUrl) {
      console.log('✅ Already started and has URL');
      return;
    }
    
    try {
      startingRef.current = true;
      setIsLoading(true);
      console.log('🏖️ Starting sandbox Metro for app:', selectedAppId);
      
      const ipcClient = IpcClient.getInstance();
      
      // Check if already running
      const currentStatus = await ipcClient.sandboxMetroStatus({ appId: selectedAppId });
      if (currentStatus.isRunning && currentStatus.webUrl) {
        console.log('✅ Sandbox Metro already running:', currentStatus.webUrl);
        setPreviewUrl(currentStatus.webUrl);
        setStatus(currentStatus);
        hasStartedRef.current = true;
        setIsLoading(false);
        startingRef.current = false;
        return;
      }
      
      // Start sandbox Metro
      const result = await ipcClient.sandboxMetroStart({ appId: selectedAppId });
      
      if (result.success && result.isRunning) {
        console.log('✅ Sandbox Metro started:', result.webUrl);
        setPreviewUrl(result.webUrl || null);
        setStatus({
          isRunning: true,
          webUrl: result.webUrl,
          lanUrl: result.lanUrl,
          port: result.port,
          httpPort: result.httpPort,
          buildStatus: 'success'
        });
        hasStartedRef.current = true;
      } else {
        console.error('❌ Failed to start sandbox Metro:', result.error);
        setStatus({
          isRunning: false,
          buildStatus: 'error',
          error: result.error || 'Failed to start sandbox Metro'
        });
      }
    } catch (error) {
      console.error('❌ Failed to start sandbox Metro:', error);
      setStatus({
        isRunning: false,
        buildStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      startingRef.current = false;
    }
  }, [selectedAppId, previewUrl]);
  
  /**
   * Stop sandbox Metro bundler
   */
  const stopSandboxMetro = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.sandboxMetroStop({ appId: selectedAppId });
      
      setPreviewUrl(null);
      setStatus({ isRunning: false });
      hasStartedRef.current = false;
      setIframeKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to stop sandbox Metro:', error);
    }
  }, [selectedAppId]);
  
  /**
   * Restart sandbox Metro
   */
  const restartSandboxMetro = useCallback(async () => {
    await stopSandboxMetro();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startSandboxMetro();
  }, [stopSandboxMetro, startSandboxMetro]);
  
  /**
   * Auto-scroll terminal to bottom
   */
  useEffect(() => {
    if (terminalRef.current && status.terminalOutput) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [status.terminalOutput]);
  
  /**
   * Check status periodically
   */
  useEffect(() => {
    if (!selectedAppId || !status.isRunning) return;
    
    const interval = setInterval(async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const currentStatus = await ipcClient.sandboxMetroStatus({ appId: selectedAppId });
        setStatus(currentStatus);
        
        if (currentStatus.webUrl && currentStatus.webUrl !== previewUrl) {
          setPreviewUrl(currentStatus.webUrl);
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [selectedAppId, status.isRunning, previewUrl]);
  
  /**
   * Reset state when app changes
   */
  useEffect(() => {
    if (!selectedAppId) return;
    
    hasStartedRef.current = false;
    startingRef.current = false;
    setPreviewUrl(null);
    setStatus({ isRunning: false });
    setIframeKey(prev => prev + 1);
    setIsLoading(false);
  }, [selectedAppId]);
  
  // Get filtered devices
  const filteredDevices = DEVICES.filter(d => 
    activeTab === 'android' ? d.platform === 'android' : d.platform === 'ios'
  );
  
  if (!selectedAppId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-500">
          Select an Expo app to preview
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Top Bar - Platform Tabs and Controls */}
      <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('android')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'android'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'ios'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            iOS
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Open in Browser Link */}
          {status.webUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(status.webUrl, '_blank')}
              className="h-8 px-3 text-xs"
              title="Open in Browser"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open in Browser
            </Button>
          )}
          
          {/* Stop Preview Button - frees port for other apps */}
          {(status.isRunning || status.buildStatus === 'error') && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopSandboxMetro}
              disabled={isLoading}
              className="h-8 px-3 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Stop Preview (frees port)"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop Preview
            </Button>
          )}
          
          {/* Restart Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={restartSandboxMetro}
            disabled={isLoading}
            className="h-8 px-3"
            title="Restart & Rebuild"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Building...' : 'Restart'}
          </Button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {!hasStartedRef.current && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-8">
              <h2 className="text-2xl mt-8 font-bold text-gray-900 dark:text-white mb-3">
                Ready to Preview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Click start to build and preview your app using sandbox Metro bundler
              </p>
              
              <button
                onClick={startSandboxMetro}
                className="group relative px-8 py-2 bg-primary text-white rounded-md font-medium text-md shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Preview
                </span>
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
                🏖️ True sandbox - works identically on Windows, macOS, and Linux
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Starting Sandbox Metro...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Bundling your app for web preview
              </p>
            </div>
          </div>
        ) : (
          /* Device Preview */
          <div className="flex flex-col items-center justify-center h-full p-8">
            {/* Device Selector */}
            <div className="relative mb-4">
              <button
                onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {selectedDevice.name}
              </button>
              
              {showDeviceMenu && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                  {filteredDevices.map(device => (
                    <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowDeviceMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedDevice.id === device.id ? 'bg-blue-100 dark:bg-blue-900 font-medium' : ''
                      }`}
                    >
                      {device.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Device Frame */}
            {(() => {
              // Calculate scale to fit in viewport while showing actual device resolution
              const maxWidth = window.innerWidth * 0.5;
              const maxHeight = window.innerHeight * 0.65;
              const scaleX = maxWidth / selectedDevice.width;
              const scaleY = maxHeight / selectedDevice.height;
              const scale = Math.min(scaleX, scaleY, 0.9); // Cap at 0.9 to not be too large
              
              return (
                <div 
                  className="relative bg-black rounded-3xl shadow-2xl overflow-hidden"
                  style={{
                    width: selectedDevice.width * scale,
                    height: selectedDevice.height * scale,
                    border: '8px solid #1a1a1a'
                  }}
                >
                  {/* Notch (for iOS) */}
                  {activeTab === 'ios' && selectedDevice.width < 450 && (
                    <div 
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-2xl z-10"
                      style={{ width: 100 * scale, height: 20 * scale }}
                    />
                  )}
                  
                  {/* Screen - Render at actual device resolution, then scale */}
                  <div 
                    style={{
                      width: selectedDevice.width,
                      height: selectedDevice.height,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    {previewUrl ? (
                      <iframe
                        key={iframeKey}
                        src={previewUrl}
                        style={{
                          width: selectedDevice.width,
                          height: selectedDevice.height,
                          border: 'none',
                          backgroundColor: 'white',
                        }}
                        title="Device Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        allow="camera; microphone; geolocation"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
                        <div className="text-center p-8">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                          <p>Loading preview...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Powered by Badge - Outside device frame */}
            <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <span>Powered by</span>
              <span className="font-semibold text-gray-600 dark:text-gray-400">Applaa</span>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {status.buildStatus === 'error' && status.error && (
          <div className="absolute inset-0 bg-red-50/90 dark:bg-red-900/20 flex items-center justify-center backdrop-blur-sm">
            <div className="max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-red-500">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Build Error</h3>
              <pre className="text-sm overflow-auto max-h-96 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {status.error}
              </pre>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-4">
                Stop this preview to clear state, or stop another app&apos;s preview to free a port, then Retry.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" onClick={stopSandboxMetro} className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Preview
                </Button>
                <Button onClick={() => restartSandboxMetro()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Terminal Output Panel */}
      {(status.isRunning || status.terminalOutput) && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-[#1e1e1e]">
          {/* Terminal Header */}
          <div 
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2d2d2d] transition-colors"
            onClick={() => setShowTerminal(!showTerminal)}
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Metro Bundler</span>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 ml-2">
                <div className={`w-2 h-2 rounded-full ${
                  status.isRunning ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-400">
                  {status.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              
              {/* Building indicator */}
              {isLoading && (
                <div className="flex items-center gap-1.5 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span className="text-xs text-blue-400">Building...</span>
                </div>
              )}
              
              {/* URL display */}
              {status.webUrl && (
                <span className="text-xs text-gray-500 ml-2 font-mono">
                  {status.webUrl}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {showTerminal ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* Terminal Content */}
          {showTerminal && (
            <div 
              ref={terminalRef}
              className="h-32 overflow-y-auto font-mono text-xs p-3 bg-[#1e1e1e] text-gray-300"
            >
              {status.terminalOutput ? (
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {status.terminalOutput
                    .split('\n')
                    .map((line, i) => {
                      // Color code different types of output
                      let className = '';
                      if (line.includes('error') || line.includes('Error') || line.includes('Failed')) {
                        className = 'text-red-400';
                      } else if (line.includes('warning') || line.includes('Warning')) {
                        className = 'text-yellow-400';
                      } else if (line.includes('✅') || line.includes('success') || line.includes('Bundled')) {
                        className = 'text-green-400';
                      } else if (line.includes('Starting') || line.includes('Waiting')) {
                        className = 'text-blue-400';
                      } else if (line.includes('%') || line.includes('▓') || line.includes('░')) {
                        className = 'text-cyan-400';
                      }
                      return (
                        <div key={i} className={className}>
                          {line}
                        </div>
                      );
                    })}
                </pre>
              ) : (
                <div className="text-gray-500 italic">
                  Waiting for Metro output...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
