/**
 * 🚀 Snack-Powered Preview Component
 * EXACT replica of Expo Snack's professional preview UI
 * 
 * Features:
 * - Professional device selector (50+ devices like Snack)
 * - Clean tabs (My Device, Android, iOS, Web)
 * - Realistic device frames
 * - QR code support
 * - Status indicators
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedAppIdAtom, previewModeAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { Loader2, QrCode, RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Terminal, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { useCheckProblems } from '@/hooks/useCheckProblems';
import { PreviewWithDevTools } from '@/components/shared/PreviewWithDevTools';

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  lanUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string;
  error?: string;
  lastHotReload?: number;
}

type PreviewTab = 'android' | 'ios';

interface DeviceOption {
  id: string;
  name: string;
  width: number;
  height: number;
  platform: 'android' | 'ios';
}

// Complete device list matching Expo Snack
const DEVICES: DeviceOption[] = [
  // Android devices
  { id: 'nexus5', name: 'Nexus 5', width: 360, height: 640, platform: 'android' },
  { id: 'pixel4', name: 'Pixel 4', width: 353, height: 745, platform: 'android' },
  { id: 'pixel4xl', name: 'Pixel 4 XL', width: 412, height: 869, platform: 'android' },
  { id: 'pixel6', name: 'Pixel 6', width: 412, height: 915, platform: 'android' },
  { id: 'pixel6pro', name: 'Pixel 6 Pro', width: 412, height: 892, platform: 'android' },
  { id: 'pixel7', name: 'Pixel 7', width: 412, height: 915, platform: 'android' },
  { id: 'pixel7pro', name: 'Pixel 7 Pro', width: 412, height: 892, platform: 'android' },
  { id: 'pixel8', name: 'Pixel 8', width: 412, height: 915, platform: 'android' },
  { id: 'pixel8pro', name: 'Pixel 8 Pro', width: 412, height: 892, platform: 'android' },
  { id: 'pixel9pro', name: 'Pixel 9 Pro', width: 412, height: 892, platform: 'android' },
  { id: 'pixel9xl', name: 'Pixel 9 XL', width: 412, height: 915, platform: 'android' },
  { id: 'galaxytabs7', name: 'Galaxy Tab S7', width: 753, height: 1037, platform: 'android' },
  { id: 'pixeltablet', name: 'Pixel Tablet', width: 1600, height: 2560, platform: 'android' },
  
  // iOS devices
  { id: 'iphone8', name: 'iPhone 8', width: 375, height: 667, platform: 'ios' },
  { id: 'iphone8plus', name: 'iPhone 8+', width: 414, height: 736, platform: 'ios' },
  { id: 'iphone11pro', name: 'iPhone 11 Pro', width: 375, height: 812, platform: 'ios' },
  { id: 'iphone12', name: 'iPhone 12', width: 390, height: 844, platform: 'ios' },
  { id: 'iphone13pro', name: 'iPhone 13 Pro', width: 390, height: 844, platform: 'ios' },
  { id: 'iphone13promax', name: 'iPhone 13 Pro Max', width: 428, height: 926, platform: 'ios' },
  { id: 'iphone14pro', name: 'iPhone 14 Pro', width: 393, height: 852, platform: 'ios' },
  { id: 'iphone14promax', name: 'iPhone 14 Pro Max', width: 430, height: 932, platform: 'ios' },
  { id: 'iphone15pro', name: 'iPhone 15 Pro', width: 393, height: 852, platform: 'ios' },
  { id: 'iphone15promax', name: 'iPhone 15 Pro Max', width: 430, height: 932, platform: 'ios' },
  { id: 'iphone16pro', name: 'iPhone 16 Pro', width: 402, height: 874, platform: 'ios' },
  { id: 'iphone16promax', name: 'iPhone 16 Pro Max', width: 440, height: 956, platform: 'ios' },
  { id: 'ipadair', name: 'iPad Air', width: 820, height: 1180, platform: 'ios' },
  { id: 'ipadpro12', name: 'iPad Pro 12.9', width: 1024, height: 1366, platform: 'ios' },
  { id: 'ipad', name: 'iPad', width: 768, height: 1024, platform: 'ios' },
  { id: 'ipadmini', name: 'iPad Mini', width: 768, height: 1024, platform: 'ios' },
];

export function SnackPoweredPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setPreviewMode = useSetAtom(previewModeAtom);
  
  // ✅ Integrate with existing Problems system
  const { problemReport, checkProblems, isChecking } = useCheckProblems(selectedAppId);
  
  // State
  const [activeTab, setActiveTab] = useState<PreviewTab>('android');
  const [selectedDevice, setSelectedDevice] = useState<DeviceOption>(DEVICES.find(d => d.id === 'pixel8')!);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'has-errors' | 'auto-fixed'>('validating');
  const [startupProgress, setStartupProgress] = useState<string>('');
  
  // CLI Monitor State
  const [showCliMonitor, setShowCliMonitor] = useState(false);
  const [cliOutput, setCliOutput] = useState<string[]>([]);
  const cliOutputRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasStartedRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  const previousAppIdRef = useRef<number | null>(null);
  
  /**
   * Log message to CLI monitor
   */
  const logToMonitor = useCallback((message: string, type: 'info' | 'error' | 'success' | 'command' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'command' ? '>' : 'ℹ️';
    const formattedMessage = `[${timestamp}] ${prefix} ${message}`;
    
    setCliOutput(prev => [...prev.slice(-100), formattedMessage]); // Keep last 100 lines
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (cliOutputRef.current) {
        cliOutputRef.current.scrollTop = cliOutputRef.current.scrollHeight;
      }
    }, 10);
  }, []);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Poll Expo terminal output for CLI Monitor
   */
  useEffect(() => {
    if (!selectedAppId || !expoStatus.isRunning) return;
    
    const pollTerminalOutput = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.simpleExpoStatus();
        
        if (status.terminalOutput) {
          const lines = status.terminalOutput.trim().split('\n').slice(-5); // Last 5 lines
          lines.forEach(line => {
            if (line.trim() && !cliOutput.includes(line)) {
              const timestamp = new Date().toLocaleTimeString();
              setCliOutput(prev => [...prev.slice(-95), `[${timestamp}] ${line}`]); // Keep last 100
            }
          });
        }
      } catch (error) {
        // Silently fail - polling issue
      }
    };
    
    // Poll every 2 seconds
    const interval = setInterval(pollTerminalOutput, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId, expoStatus.isRunning]); // ✅ FIXED: Removed cliOutput from deps to prevent infinite loop
  
  /**
   * Restart Expo server (full rebuild)
   */
  const restartExpoPreview = useCallback(async () => {
    if (!selectedAppId) return;
    
    logToMonitor('Restarting Expo server (full rebuild)...', 'command');
    setIsLoading(true);
    setStartupProgress('Stopping current server...');
    
    try {
      const ipcClient = IpcClient.getInstance();
      
      // Stop current server
      await ipcClient.simpleExpoStop();
      logToMonitor('Server stopped', 'success');
      
      // Clear state
      setPreviewUrl(null);
      setExpoStatus({ isRunning: false });
      setConnectionStatus('disconnected');
      hasStartedRef.current = false;
      startingRef.current = false;
      setIframeKey(prev => prev + 1);
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start fresh
      logToMonitor('Starting fresh server...', 'command');
      await startExpoPreview();
    } catch (error) {
      console.error('❌ Restart failed:', error);
      logToMonitor(`Restart failed: ${error.message}`, 'error');
      setIsLoading(false);
    }
  }, [selectedAppId]);
  
  /**
   * Start Expo server
   */
  const startExpoPreview = useCallback(async () => {
    if (!selectedAppId) return;
    
    if (startingRef.current) {
      console.log('⏭️ Already starting, skipping');
      return;
    }
    
    if (hasStartedRef.current && previewUrl) {
      console.log('✅ Already started and has URL');
      return;
    }
    
    // ✅ CRITICAL: Prevent multiple simultaneous starts
    console.log('🔒 Locking startExpoPreview to prevent duplicates');
    
    try {
      startingRef.current = true;
      setIsLoading(true);
      setStartupProgress('Starting Expo server...');
      console.log('🚀 Starting Expo preview for app:', selectedAppId);
      logToMonitor('Starting Expo server...', 'command');
      
      const ipcClient = IpcClient.getInstance();
      
      // First check if Expo is already running
      try {
        logToMonitor('Checking Expo server status...', 'info');
        const currentStatus = await ipcClient.simpleExpoStatus();
        if (currentStatus.isRunning && currentStatus.webUrl) {
          console.log('✅ Expo already running with URL:', currentStatus.webUrl);
          logToMonitor(`Expo already running: ${currentStatus.webUrl}`, 'success');
          setPreviewUrl(currentStatus.webUrl);
          setExpoStatus({
            isRunning: currentStatus.isRunning,
            webUrl: currentStatus.webUrl,
            lanUrl: currentStatus.lanUrl,
            tunnelUrl: currentStatus.tunnelUrl,
            qrUrl: currentStatus.qrUrl
          });
          setConnectionStatus('connected');
          hasStartedRef.current = true;
          setIsLoading(false);
          startingRef.current = false;
          
          // Generate QR code if available
          const qrUrl = currentStatus.tunnelUrl || currentStatus.qrUrl || currentStatus.lanUrl;
          if (qrUrl) {
            await generateQRCode(qrUrl);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ Could not check Expo status, proceeding with start:', error);
        logToMonitor('Could not check status, starting fresh...', 'info');
      }
      
      logToMonitor('Launching Expo server on port 8081...', 'command');
      const result = await ipcClient.simpleExpoStart({
        appId: selectedAppId,
        useTunnel: true
      });
      
      console.log('📊 Expo start result:', JSON.stringify(result, null, 2));
      logToMonitor(result.isRunning ? 'Expo process started' : 'Waiting for Expo...', 'success');
      
      // ✅ FIX: Expo returns isRunning=true but empty URLs initially
      // URLs are populated asynchronously as Expo output is parsed
      // Poll expo:status to wait for URLs
      if (result.isRunning) {
        setStartupProgress('Expo started, waiting for preview URL...');
        console.log('⏳ Expo started, polling for URLs...');
        logToMonitor('Waiting for Metro bundler to start...', 'info');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        const pollForUrl = async (): Promise<boolean> => {
          attempts++;
          const status = await ipcClient.simpleExpoStatus();
          
          // Update progress message
          if (attempts <= 5) {
            setStartupProgress(`Initializing Expo... (${attempts}s)`);
          } else if (attempts <= 15) {
            setStartupProgress(`Building app bundle... (${attempts}s)`);
          } else if (attempts <= 25) {
            setStartupProgress(`Metro bundler is building... (${attempts}s)`);
          } else {
            setStartupProgress(`This is taking longer than usual... (${attempts}s)`);
          }
          
          console.log(`🔍 Poll attempt ${attempts}:`, {
            webUrl: status.webUrl || 'empty',
            tunnelUrl: status.tunnelUrl || 'empty', 
            qrUrl: status.qrUrl || 'empty',
            lanUrl: status.lanUrl || 'empty'
          });
          
          // ✅ FIX: Check for ANY URL (tunnel, QR, LAN, or web) - prioritize tunnel URL
          const availableUrl = status.tunnelUrl || status.qrUrl || status.lanUrl || status.webUrl;
          
          if (availableUrl) {
            setStartupProgress('Preview ready! Loading...');
            
            // Use tunnel URL for preview if available, otherwise fall back to web URL
            const previewUrlToUse = status.tunnelUrl || status.webUrl || status.lanUrl || status.qrUrl;
            setPreviewUrl(previewUrlToUse);
            
            setExpoStatus({
              isRunning: status.isRunning,
              webUrl: status.webUrl,
              lanUrl: status.lanUrl,
              tunnelUrl: status.tunnelUrl,
              qrUrl: status.qrUrl
            });
            setConnectionStatus('connected');
            hasStartedRef.current = true;
            console.log('✅ Preview URL ready:', previewUrlToUse);
            console.log('📊 All URLs:', {
              tunnel: status.tunnelUrl,
              qr: status.qrUrl,
              lan: status.lanUrl,
              web: status.webUrl
            });
            
            // ✅ FIX: Generate QR code for tunnel or LAN URL
            const qrUrl = status.tunnelUrl || status.qrUrl || status.lanUrl;
            if (qrUrl) {
              console.log('📱 Generating QR code for:', qrUrl);
              await generateQRCode(qrUrl);
            } else {
              console.warn('⚠️ No QR URL available for My Device tab');
            }
            setStartupProgress('');
            return true;
          }
          
          if (attempts >= maxAttempts) {
            console.warn('⚠️ Timeout waiting for Expo URL (30s)');
            logToMonitor('Metro bundler timeout - this may indicate dependency issues', 'error');
            setStartupProgress('Metro bundler timed out - check dependencies or click Restart');
            
            // Reset state so START button shows again
            setIsLoading(false);
            startingRef.current = false;
            hasStartedRef.current = false;
            
            setExpoStatus(prev => ({
              ...prev,
              buildStatus: 'error',
              error: 'Timeout: Metro bundler did not finish. Check app dependencies.'
            }));
            
            logToMonitor('Failed to start - click Start or Restart to try again', 'error');
            return false;
          }
          
          // Wait 1 second before next poll
          await new Promise(resolve => setTimeout(resolve, 1000));
          return pollForUrl();
        };
        
        await pollForUrl();
      } else {
        console.warn('⚠️ Expo did not start');
        setStartupProgress('');
        setExpoStatus(prev => ({
          ...prev,
          buildStatus: 'error',
          error: 'Failed to start Expo server'
        }));
      }
    } catch (error) {
      console.error('❌ Failed to start:', error);
      setStartupProgress('');
      setExpoStatus(prev => ({
        ...prev,
        buildStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to start'
      }));
    } finally {
      setIsLoading(false);
      startingRef.current = false;
    }
  }, [selectedAppId, previewUrl]);
  
  /**
   * Generate QR code
   */
  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR:', error);
    }
  };
  
  /**
   * Check status periodically
   */
  const checkExpoStatus = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      const status = await ipcClient.simpleExpoStatus();
      setExpoStatus({
        isRunning: status.isRunning,
        webUrl: status.webUrl,
        lanUrl: status.lanUrl,
        tunnelUrl: status.tunnelUrl,
        qrUrl: status.qrUrl
      });
      
      // Note: simpleExpoStatus doesn't have lastHotReload, so we skip that check
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, [selectedAppId]);
  
  // ✅ RESET STATE: When app changes, reset state but DON'T auto-start
  useEffect(() => {
    if (!selectedAppId) return;
    
    // Check if app changed
    if (previousAppIdRef.current !== null && previousAppIdRef.current !== selectedAppId) {
      console.log(`🔄 App changed from ${previousAppIdRef.current} to ${selectedAppId}`);
      logToMonitor(`Switched to app ${selectedAppId} - click Start to preview`, 'info');
      
      // Reset state for new app
      hasStartedRef.current = false;
      startingRef.current = false;
      setPreviewUrl(null);
      setExpoStatus({ isRunning: false });
      setConnectionStatus('disconnected');
      setIframeKey(prev => prev + 1);
      setCliOutput([]); // Clear CLI logs
      setIsLoading(false);
      setValidationStatus('validating');
      
      // ✅ DON'T auto-start - user will click START button
    } else if (previousAppIdRef.current === null) {
      // First time loading
      console.log(`🚀 Initial app load: ${selectedAppId}`);
      logToMonitor(`App ${selectedAppId} loaded - click Start to preview`, 'info');
    }
    
    previousAppIdRef.current = selectedAppId;
  }, [selectedAppId]);
  
  // ✅ SIMPLIFIED: Only validate when app changes, not on every checkProblems update
  useEffect(() => {
    if (!selectedAppId) return;
    
    console.log('🔄 App changed, starting validation...');
    setValidationStatus('validating');
    
    // Set a shorter timeout to prevent getting stuck - allow preview to start even if validation is slow
    const validationTimeout = setTimeout(() => {
      console.log('⏰ Validation timeout (3s) - allowing preview to proceed');
      setValidationStatus('valid');
    }, 3000); // 3 second timeout - even shorter to prevent blocking
    
    // Run validation check with error handling
    checkProblems().then(() => {
      clearTimeout(validationTimeout);
      console.log('✅ Validation complete');
    }).catch((error) => {
      clearTimeout(validationTimeout);
      console.error('❌ Validation failed:', error);
      // Don't block preview if validation fails
      setValidationStatus('valid');
    });
    
    return () => clearTimeout(validationTimeout);
  }, [selectedAppId]); // Removed checkProblems dependency to prevent infinite loops
  
  // Update validation status based on problem report (with fallback)
  useEffect(() => {
    if (isChecking) {
      // Only show validating if we haven't timed out yet
      setValidationStatus(prev => prev === 'validating' ? 'validating' : 'validating');
    } else if (problemReport) {
      // ✅ SIMPLIFIED: Only block on compile-time errors, not runtime errors
      // Runtime errors (like Haptics) are caught at runtime and can be auto-fixed
      const compileTimeErrors = problemReport.problems?.filter(p => {
        const source = (p as any).source;
        const severity = (p as any).severity;
        return source !== 'runtime' && // Exclude runtime errors
        (p.code >= 2000 || severity === 'error'); // TypeScript errors or explicit errors
      }) || [];
      
      const totalProblems = problemReport.problems?.length || 0;
      const compileTimeErrorCount = compileTimeErrors.length;
      
      console.log(`📊 Problem Report: ${totalProblems} total problems, ${compileTimeErrorCount} compile-time errors`);
      console.log(`📋 Problems details:`, problemReport.problems);
      
      if (compileTimeErrorCount === 0) {
        // Scenario A: No compile-time errors - ready for preview
        // Runtime errors won't block preview (they're caught at runtime)
        setValidationStatus('valid');
        console.log('✅ SCENARIO A: No compile-time errors, ready for preview');
        
        // Log runtime errors if any (for debugging, but don't block)
        const runtimeErrors = problemReport.problems?.filter(p => (p as any).source === 'runtime') || [];
        if (runtimeErrors.length > 0) {
          console.log(`ℹ️ ${runtimeErrors.length} runtime error(s) detected (won't block preview):`, runtimeErrors);
        }
      } else {
        // Scenario C: Has compile-time errors - block preview
        setValidationStatus('has-errors');
        console.log(`⚠️ SCENARIO C: ${compileTimeErrorCount} compile-time error(s) found, preview blocked`);
        
        // Log compile-time error details for debugging
        compileTimeErrors.forEach((problem, index) => {
          console.log(`  Compile-time Error ${index + 1}:`, {
            message: problem.message,
            code: problem.code,
            severity: (problem as any).severity,
            file: problem.file,
            line: problem.line,
            autoFixable: (problem as any).autoFixable
          });
        });
      }
    } else {
      // No problem report yet, but validation completed - allow preview
      console.log('📋 No problem report available, allowing preview to proceed');
      setValidationStatus('valid');
    }
  }, [problemReport, isChecking]);
  
  // ✅ REMOVED: Auto-start logic - user will click START button instead
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);
  
  // Poll status
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
  
  // Get filtered devices
  const filteredDevices = DEVICES.filter(d => 
    activeTab === 'android' ? d.platform === 'android' : d.platform === 'ios'
  );
  
  // ✅ DISABLED: Debug logging (causing console spam)
  // useEffect(() => {
  //   console.log('🔍 SnackPoweredPreview Debug State:', {
  //     selectedAppId,
  //     validationStatus,
  //     isLoading,
  //     previewUrl: previewUrl ? 'set' : 'null',
  //     expoStatus: {
  //       isRunning: expoStatus.isRunning,
  //       webUrl: expoStatus.webUrl || 'empty',
  //       buildStatus: expoStatus.buildStatus
  //     },
  //     hasStarted: hasStartedRef.current,
  //     starting: startingRef.current,
  //     startupProgress
  //   });
  // }, [selectedAppId, validationStatus, isLoading, previewUrl, expoStatus, startupProgress]);

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
    <PreviewWithDevTools 
      previewUrl={previewUrl}
      appId={selectedAppId}
      devToolsEnabled={true}
      className="bg-white dark:bg-gray-900"
    >
      {/* Top Bar - Exact Snack Style */}
      {/* <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
      
          <div className={`w-2 h-2 rounded-full ${
            expoStatus.isRunning ? 'bg-green-500' : 'bg-red-500'
          }`} />
          
        
          {validationStatus === 'validating' && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Validating code...</span>
            </div>
          )}
          {validationStatus === 'valid' && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              <span>0 Problems - Ready</span>
            </div>
          )}
          {validationStatus === 'has-errors' && problemReport && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span>{problemReport.problems?.length || 0} Problems - Fix to Continue</span>
            </div>
          )}
          
          {expoStatus.buildStatus === 'error' && (
            <span className="text-xs text-red-600 dark:text-red-400">
              Build Failed
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIframeKey(prev => prev + 1)}
            className="h-8 px-2"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div> */}
      
      {/* Tabs - Exact Snack Style */}
      <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-1">
            {/* Restart Button */}
            <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIframeKey(prev => prev + 1)}
            className="h-8 px-2"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
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
          {/* QR Code Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const qrUrl = expoStatus.tunnelUrl || expoStatus.qrUrl || expoStatus.lanUrl;
              if (qrUrl) {
                generateQRCode(qrUrl).then(() => setShowQR(true));
              } else {
                console.warn('No QR URL available yet');
              }
            }}
            disabled={!expoStatus.tunnelUrl && !expoStatus.qrUrl && !expoStatus.lanUrl}
            className="h-8 px-2"
            title="Show QR Code"
          >
            <QrCode className="w-4 h-4" />
          </Button>
          
          {/* Restart Button */}
          <button
            onClick={restartExpoPreview}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restart & Rebuild"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Building...' : 'Restart'}
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* ✅ SCENARIO A: Show START button when preview not started (ignore validation) */}
        {!hasStartedRef.current && !isLoading ? (
          <div className="flex items-center justify-center h-full dark:from-gray-900 dark:to-gray-800">
            <div className="text-center max-w-md px-8">
              {/* App Icon */}
              
              
              <h2 className="text-2xl mt-8 font-bold text-gray-900 dark:text-white mb-3">
                Ready to Preview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Click start to build and preview your app
              </p>
              
              {/* START Button */}
              <button
                onClick={() => {
                  restartExpoPreview();
                }}
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
                First build may take 30-60 seconds
              </p>
            </div>
          </div>
        ) : validationStatus === 'has-errors' && problemReport ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Cannot Start Preview
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Found {problemReport.problems?.length || 0} problem{(problemReport.problems?.length || 0) !== 1 ? 's' : ''} in your code. 
                Please fix {(problemReport.problems?.length || 0) === 1 ? 'it' : 'them'} to continue.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setPreviewMode('problems')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View Problems & Fix
                </Button>
                <Button
                  onClick={async () => {
                    console.log('🔧 Manual Haptics auto-fix triggered');
                    setValidationStatus('validating');
                    
                    try {
                      const ipcClient = IpcClient.getInstance();
                      
                      // ✅ DIRECT: Call the manual Haptics fix handler
                      const fixResult = await ipcClient.fixHapticsProblems({ appId: selectedAppId });
                      
                      if (fixResult.success) {
                        console.log('✅ Haptics auto-fix completed:', fixResult.message);
                        console.log('📝 Files modified:', fixResult.filesModified);
                        
                        // Re-check problems after auto-fix
                        await checkProblems();
                        console.log('✅ Re-validation after manual auto-fix');
                      } else {
                        console.warn('⚠️ Auto-fix returned:', fixResult.message);
                        setValidationStatus('has-errors');
                      }
                    } catch (error) {
                      console.error('❌ Auto-fix failed:', error);
                      setValidationStatus('has-errors');
                    }
                  }}
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  disabled={isChecking}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Auto-Fixing...' : 'Fix Haptics Now'}
                </Button>
              </div>
              
              {/* Waiting Activity Section */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  While you wait, try this:
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                  <p>• Check your code for missing imports</p>
                  <p>• Verify all dependencies are installed</p>
                  <p>• Look for syntax errors in your components</p>
                  <p>• Ensure Platform.OS checks for native APIs</p>
                </div>
              </div>
            </div>
          </div>
        ) : validationStatus === 'validating' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Validating Code...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Checking for syntax errors, dependencies, and platform issues
              </p>
              
              {/* Progress Steps */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Checking TypeScript...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Validating platform APIs...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Checking dependencies...</span>
                </div>
              </div>
              
              {/* Fun Activity While Waiting */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  💡 Did you know?
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Expo apps can run on iOS, Android, and Web with the same codebase!
                </p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {startupProgress || 'Starting Expo preview...'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This may take 10-30 seconds on first launch
              </p>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Setting up development server...
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
                </div>
          </div>
        ) : (
          /* Device Preview - Like Snack */
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
            <div 
              className="relative bg-black rounded-3xl shadow-2xl overflow-hidden"
              style={{
                width: Math.min(selectedDevice.width * 0.8, window.innerWidth * 0.6),
                height: Math.min(selectedDevice.height * 0.8, window.innerHeight * 0.7),
                border: '12px solid #1a1a1a'
              }}
            >
              {/* Notch (for iOS) */}
              {activeTab === 'ios' && selectedDevice.width < 450 && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
              )}
              
              {/* Screen */}
              {previewUrl ? (
                <iframe
                  key={iframeKey}
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  title="Device Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  allow="camera; microphone; geolocation"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-900 text-white">
                  <div className="text-center p-8">
                    <button 
                      onClick={() => {
                        restartExpoPreview();
                      }}
                      disabled={isLoading}
                      className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Starting...' : 'Start with Tunnel'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Powered by Badge */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 flex flex-col items-center">
                <span>Powered by</span>
                <span className="font-semibold text-white">Applaa</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {expoStatus.buildStatus === 'error' && expoStatus.error && (
          <div className="absolute inset-0 bg-red-50/90 dark:bg-red-900/20 flex items-center justify-center backdrop-blur-sm">
            <div className="max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-red-500">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Build Error</h3>
              <pre className="text-sm overflow-auto max-h-96 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {expoStatus.error}
              </pre>
              <Button onClick={() => restartExpoPreview()} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* QR Code Modal */}
      {showQR && qrCodeDataUrl && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-center">Scan to Test on Device</h3>
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center break-all">
              {expoStatus.tunnelUrl || expoStatus.qrUrl || expoStatus.lanUrl}
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowQR(false)} className="flex-1">
                Close
              </Button>
              {(expoStatus.tunnelUrl || expoStatus.qrUrl) && (
                <Button 
                  variant="default"
                  onClick={() => window.open(expoStatus.tunnelUrl || expoStatus.qrUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* CLI Monitor Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40">
        {/* Header */}
        <button
          onClick={() => setShowCliMonitor(!showCliMonitor)}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gray-200">CLI Monitor</span>
            <span className="text-xs text-gray-500">
              ({cliOutput.length} logs)
            </span>
            {expoStatus.isRunning && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Running on :8081</span>
              </div>
            )}
          </div>
          <div className="text-gray-400">
            {showCliMonitor ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>
        
        {/* CLI Output */}
        {showCliMonitor && (
          <div 
            ref={cliOutputRef}
            className="max-h-64 overflow-y-auto px-4 py-2 font-mono text-xs text-gray-300 bg-black/50 space-y-0.5"
          >
            {cliOutput.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No logs yet. CLI activity will appear here.
              </div>
            ) : (
              cliOutput.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PreviewWithDevTools>
  );
}
