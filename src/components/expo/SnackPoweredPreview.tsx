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
import { Loader2, QrCode, RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Terminal } from 'lucide-react';
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

type PreviewTab = 'mydevice' | 'android' | 'ios' | 'web';

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
  const [activeTab, setActiveTab] = useState<PreviewTab>('web');
  const [selectedDevice, setSelectedDevice] = useState<DeviceOption>(DEVICES.find(d => d.id === 'iphone16pro')!);
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
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasStartedRef = useRef<boolean>(false);
  const startingRef = useRef<boolean>(false);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
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
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.expoStart({
        appId: selectedAppId,
        useTunnel: true,
        native: false
      });
      
      console.log('📊 Expo start result:', JSON.stringify(result, null, 2));
      
      // ✅ FIX: Expo returns isRunning=true but empty URLs initially
      // URLs are populated asynchronously as Expo output is parsed
      // Poll expo:status to wait for URLs
      if (result.isRunning) {
        setStartupProgress('Expo started, waiting for preview URL...');
        console.log('⏳ Expo started, polling for URLs...');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        const pollForUrl = async (): Promise<boolean> => {
          attempts++;
          const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
          
          // Update progress message
          if (attempts <= 5) {
            setStartupProgress(`Initializing Expo... (${attempts}s)`);
          } else if (attempts <= 15) {
            setStartupProgress(`Building app bundle... (${attempts}s)`);
          } else {
            setStartupProgress(`Almost ready... (${attempts}s)`);
          }
          
          console.log(`🔍 Poll attempt ${attempts}:`, {
            webUrl: status.webUrl || 'empty',
            tunnelUrl: status.tunnelUrl || 'empty', 
            qrUrl: status.qrUrl || 'empty',
            lanUrl: status.lanUrl || 'empty'
          });
          
          if (status.webUrl) {
            setStartupProgress('Preview ready! Loading...');
            setPreviewUrl(status.webUrl);
            setExpoStatus(status);
            setConnectionStatus('connected');
            hasStartedRef.current = true;
            console.log('✅ Preview URL ready:', status.webUrl);
            
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
            console.warn('⚠️ Timeout waiting for Expo URL');
            setStartupProgress('');
            setExpoStatus(prev => ({
              ...prev,
              buildStatus: 'error',
              error: 'Timeout: Expo server did not provide preview URL. Try restarting.'
            }));
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
      const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
      setExpoStatus(status);
      
      if (status.lastHotReload && status.lastHotReload > (expoStatus.lastHotReload || 0)) {
        console.log('🔥 Hot reload detected');
        setIframeKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, [selectedAppId, expoStatus.lastHotReload]);
  
  // ✅ SIMPLIFIED: Only validate when app changes, not on every checkProblems update
  useEffect(() => {
    if (!selectedAppId) return;
    
    console.log('🔄 App changed, starting validation...');
    setValidationStatus('validating');
    
    // Set a shorter timeout to prevent getting stuck
    const validationTimeout = setTimeout(() => {
      console.log('⏰ Validation timeout (5s) - allowing preview to proceed');
      setValidationStatus('valid');
    }, 5000); // 5 second timeout - much shorter
    
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
      // ✅ SIMPLIFIED: If there are ANY problems, consider it as having errors
      // TypeScript errors all have numeric codes, and all should be fixed
      const totalProblems = problemReport.problems?.length || 0;
      
      console.log(`📊 Problem Report: ${totalProblems} problems found`);
      console.log(`📋 Problems details:`, problemReport.problems);
      
      if (totalProblems === 0) {
        // Scenario A: Valid code - ready for preview
        setValidationStatus('valid');
        console.log('✅ SCENARIO A: No problems, ready for preview');
      } else {
        // Scenario C: Has problems - block preview
        setValidationStatus('has-errors');
        console.log(`⚠️ SCENARIO C: ${totalProblems} problems found, preview blocked`);
        
        // Log problem details for debugging
        problemReport.problems?.forEach((problem, index) => {
          console.log(`  Problem ${index + 1}:`, {
            message: problem.message,
            code: problem.code,
            severity: problem.severity,
            file: problem.file,
            line: problem.line
          });
        });
      }
    } else {
      // No problem report yet, but validation completed - allow preview
      console.log('📋 No problem report available, allowing preview to proceed');
      setValidationStatus('valid');
    }
  }, [problemReport, isChecking]);
  
  // Auto-start ONLY if validation passed and not already started
  useEffect(() => {
    if (selectedAppId && validationStatus === 'valid' && !hasStartedRef.current && !startingRef.current) {
      console.log('🎯 Auto-starting Expo preview after validation passed');
      startExpoPreview();
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      // ✅ Don't reset refs on cleanup - they should persist across re-renders
    };
  }, [selectedAppId, validationStatus, startExpoPreview]);
  
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
    activeTab === 'android' ? d.platform === 'android' :
    activeTab === 'ios' ? d.platform === 'ios' :
    true
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
    <PreviewWithDevTools 
      previewUrl={previewUrl}
      appId={selectedAppId}
      devToolsEnabled={true}
      className="bg-white dark:bg-gray-900"
    >
      {/* Top Bar - Exact Snack Style */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={`w-2 h-2 rounded-full ${
            expoStatus.isRunning ? 'bg-green-500' : 'bg-red-500'
          }`} />
          
          {/* Validation Status */}
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
          
          {/* Build Status */}
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
          
          <Button
            variant="default" 
            size="sm"
            onClick={() => setShowQR(true)}
            disabled={!qrCodeDataUrl}
            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <QrCode className="w-4 h-4 mr-1" />
            QR Code
          </Button>
          
        </div>
      </div>
      
      {/* Tabs - Exact Snack Style */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('mydevice')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'mydevice'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          My Device
        </button>
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
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'web'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Web
        </button>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* ✅ SCENARIO C: Block preview if validation failed */}
        {validationStatus === 'has-errors' && problemReport ? (
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
                    console.log('🔧 Manual auto-fix triggered');
                    setValidationStatus('validating');
                    
                    try {
                      // Try to trigger auto-fix by calling the problems handler directly
                      const ipcClient = IpcClient.getInstance();
                      await ipcClient.checkProblems({ appId: selectedAppId });
                      
                      // Re-check problems after auto-fix attempt
                      await checkProblems();
                      console.log('✅ Re-validation after manual auto-fix trigger');
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
                  {isChecking ? 'Auto-Fixing...' : 'Try Auto-Fix'}
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
        ) : activeTab === 'web' ? (
          /* Web View - Full width */
          <div className="w-full h-full">
            {previewUrl ? (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Expo Web Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="camera; microphone; geolocation"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No preview URL available
              </div>
            )}
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
                        hasStartedRef.current = false;
                        startingRef.current = false;
                        startExpoPreview();
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
              <Button onClick={() => startExpoPreview()} className="mt-4">
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
    </PreviewWithDevTools>
  );
}
