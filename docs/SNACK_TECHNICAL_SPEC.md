# Snack-Inspired Preview: Technical Specification
## Detailed Implementation Guide

**Branch:** `feature/expo-preview-improvements`  
**Status:** Planning Phase  
**Priority:** High

---

## 🏗 Architecture Overview

### Current System
```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Monaco     │─IPC─▶│   Expo       │─────▶│   Metro      │
│   Editor     │      │   Handlers   │      │   Bundler    │
└──────────────┘      └──────────────┘      └──────────────┘
                            │
                            ▼
                      ┌──────────────┐
                      │   iframe     │
                      │   Preview    │
                      └──────────────┘
```

### Proposed Snack-Inspired System
```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Monaco     │◀────▶│  Hot Reload  │◀────▶│   Metro      │
│   Editor     │      │   Manager    │      │   Monitor    │
└──────────────┘      └──────────────┘      └──────────────┘
      │                     │                      │
      │                     ▼                      │
      │              ┌──────────────┐              │
      │              │  File System │              │
      │              │   Watcher    │              │
      │              └──────────────┘              │
      │                     │                      │
      └─────────────────────┼──────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │  Smart Preview  │
                   │  Frame + Status │
                   └─────────────────┘
```

---

## 📁 File Structure

### New Files to Create

```
src/
├── preview/
│   ├── ExpoHotReloadManager.ts        # Core hot reload logic
│   ├── MetroBundlerMonitor.ts         # Metro status tracking
│   ├── PreviewWebSocket.ts            # Real-time communication
│   └── FileSystemWatcher.ts           # File change detection
│
├── components/expo/
│   ├── SnackInspiredPreview.tsx       # Main preview component
│   ├── BuildStatusBar.tsx             # Top status bar
│   ├── ErrorOverlay.tsx               # In-preview errors
│   ├── QRCodePanel.tsx                # Enhanced QR display
│   └── ConnectionIndicator.tsx        # Connection status
│
└── ipc/handlers/
    └── enhanced_expo_handlers.ts       # Enhanced IPC methods
```

### Files to Modify

```
src/
├── ipc/handlers/
│   ├── expo_handlers.ts               # Enhance existing handlers
│   └── app_handlers.ts                # Better hot reload trigger
│
├── components/preview_panel/
│   ├── PreviewPanel.tsx               # Use new preview component
│   └── FileEditor.tsx                 # Trigger hot reload on save
│
└── hooks/
    └── useExpoPreview.ts              # New hook for preview state
```

---

## 🔧 Implementation Details

### 1. Enhanced Hot Reload Manager

**File:** `src/preview/ExpoHotReloadManager.ts`

```typescript
import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import path from 'path';
import log from 'electron-log';

interface HotReloadEvent {
  appId: number;
  filePath: string;
  changeType: 'change' | 'add' | 'unlink';
  timestamp: number;
}

interface HotReloadOptions {
  debounceMs?: number;
  ignorePatterns?: string[];
}

export class ExpoHotReloadManager extends EventEmitter {
  private static instance: ExpoHotReloadManager;
  private watchers = new Map<number, FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastReloadTime = new Map<number, number>();
  
  private constructor() {
    super();
  }
  
  static getInstance(): ExpoHotReloadManager {
    if (!ExpoHotReloadManager.instance) {
      ExpoHotReloadManager.instance = new ExpoHotReloadManager();
    }
    return ExpoHotReloadManager.instance;
  }
  
  /**
   * Start watching app directory for changes
   */
  startWatching(
    appId: number, 
    appPath: string, 
    options: HotReloadOptions = {}
  ): void {
    // Stop existing watcher if any
    this.stopWatching(appId);
    
    const {
      debounceMs = 300,
      ignorePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/ios/**',
        '**/android/**',
        '**/.expo/**',
        '**/dist/**',
        '**/build/**'
      ]
    } = options;
    
    log.info(`🔥 Starting hot reload watcher for app ${appId} at ${appPath}`);
    
    const watcher = chokidar.watch(appPath, {
      ignored: ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: debounceMs,
        pollInterval: 100
      }
    });
    
    // File changed
    watcher.on('change', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'change', debounceMs);
    });
    
    // File added
    watcher.on('add', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'add', debounceMs);
    });
    
    // File deleted
    watcher.on('unlink', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'unlink', debounceMs);
    });
    
    // Watch errors
    watcher.on('error', (error: Error) => {
      log.error(`File watcher error for app ${appId}:`, error);
      this.emit('error', { appId, error });
    });
    
    this.watchers.set(appId, watcher);
    log.info(`✅ Hot reload watcher started for app ${appId}`);
  }
  
  /**
   * Handle file change with debouncing
   */
  private handleFileChange(
    appId: number,
    filePath: string,
    changeType: 'change' | 'add' | 'unlink',
    debounceMs: number
  ): void {
    const fileExt = path.extname(filePath);
    
    // Only watch relevant file types
    const watchedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css'];
    if (!watchedExtensions.includes(fileExt)) {
      return;
    }
    
    log.debug(`🔥 File ${changeType}: ${filePath}`);
    
    // Create debounce key
    const debounceKey = `${appId}:${filePath}`;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.triggerHotReload(appId, filePath, changeType);
      this.debounceTimers.delete(debounceKey);
    }, debounceMs);
    
    this.debounceTimers.set(debounceKey, timer);
  }
  
  /**
   * Trigger hot reload for app
   */
  async triggerHotReload(
    appId: number,
    filePath: string,
    changeType: 'change' | 'add' | 'unlink'
  ): Promise<void> {
    const now = Date.now();
    const lastReload = this.lastReloadTime.get(appId) || 0;
    
    // Prevent too frequent reloads (min 500ms between)
    if (now - lastReload < 500) {
      log.debug(`🔥 Skipping reload for app ${appId} - too soon`);
      return;
    }
    
    this.lastReloadTime.set(appId, now);
    
    const event: HotReloadEvent = {
      appId,
      filePath,
      changeType,
      timestamp: now
    };
    
    log.info(`🔥 Triggering hot reload for app ${appId}: ${filePath}`);
    
    // Emit event for IPC handlers
    this.emit('hot-reload', event);
    
    // Notify Metro bundler (if running)
    await this.notifyMetro(appId);
  }
  
  /**
   * Notify Metro bundler of changes
   */
  private async notifyMetro(appId: number): Promise<void> {
    try {
      // Metro has a built-in reload endpoint
      const response = await fetch('http://localhost:8081/reload', {
        method: 'POST'
      });
      
      if (response.ok) {
        log.info(`✅ Metro bundler notified for app ${appId}`);
      }
    } catch (error) {
      // Metro might not be running, that's okay
      log.debug(`Metro notification failed for app ${appId}:`, error);
    }
  }
  
  /**
   * Stop watching app
   */
  stopWatching(appId: number): void {
    const watcher = this.watchers.get(appId);
    if (watcher) {
      log.info(`🛑 Stopping hot reload watcher for app ${appId}`);
      watcher.close();
      this.watchers.delete(appId);
      this.lastReloadTime.delete(appId);
      
      // Clear any pending debounce timers
      for (const [key, timer] of this.debounceTimers.entries()) {
        if (key.startsWith(`${appId}:`)) {
          clearTimeout(timer);
          this.debounceTimers.delete(key);
        }
      }
    }
  }
  
  /**
   * Get watching status
   */
  isWatching(appId: number): boolean {
    return this.watchers.has(appId);
  }
  
  /**
   * Clean up all watchers
   */
  stopAll(): void {
    log.info('🛑 Stopping all hot reload watchers');
    for (const [appId] of this.watchers) {
      this.stopWatching(appId);
    }
  }
}
```

---

### 2. Metro Bundler Monitor

**File:** `src/preview/MetroBundlerMonitor.ts`

```typescript
import log from 'electron-log';
import { EventEmitter } from 'events';

export interface MetroStatus {
  running: boolean;
  port?: number;
  version?: string;
  bundling?: boolean;
  bundleProgress?: number;
  error?: string;
  logs?: string[];
  lastUpdate?: number;
}

export interface BuildEvent {
  appId: number;
  status: 'started' | 'progress' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: Error;
}

export class MetroBundlerMonitor extends EventEmitter {
  private static instance: MetroBundlerMonitor;
  private metroPorts = new Map<number, number>();
  private metroStatus = new Map<number, MetroStatus>();
  private buildLogs = new Map<number, string[]>();
  private pollIntervals = new Map<number, NodeJS.Timeout>();
  
  private constructor() {
    super();
  }
  
  static getInstance(): MetroBundlerMonitor {
    if (!MetroBundlerMonitor.instance) {
      MetroBundlerMonitor.instance = new MetroBundlerMonitor();
    }
    return MetroBundlerMonitor.instance;
  }
  
  /**
   * Register Metro port for an app
   */
  registerMetro(appId: number, port: number): void {
    log.info(`📊 Registering Metro on port ${port} for app ${appId}`);
    this.metroPorts.set(appId, port);
    
    // Start polling Metro status
    this.startPolling(appId);
  }
  
  /**
   * Start polling Metro status
   */
  private startPolling(appId: number): void {
    // Clear existing interval
    this.stopPolling(appId);
    
    // Poll every 2 seconds
    const interval = setInterval(async () => {
      await this.checkMetroStatus(appId);
    }, 2000);
    
    this.pollIntervals.set(appId, interval);
    
    // Do initial check
    this.checkMetroStatus(appId);
  }
  
  /**
   * Stop polling Metro status
   */
  private stopPolling(appId: number): void {
    const interval = this.pollIntervals.get(appId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(appId);
    }
  }
  
  /**
   * Check Metro bundler status
   */
  private async checkMetroStatus(appId: number): Promise<void> {
    const port = this.metroPorts.get(appId);
    if (!port) {
      this.metroStatus.set(appId, { running: false });
      return;
    }
    
    try {
      // Check Metro health endpoint
      const response = await fetch(`http://localhost:${port}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const status: MetroStatus = {
          running: true,
          port,
          version: data.version,
          bundling: data.bundleInProgress || false,
          bundleProgress: data.bundleProgress || 0,
          logs: this.buildLogs.get(appId) || [],
          lastUpdate: Date.now()
        };
        
        // Check if bundling status changed
        const oldStatus = this.metroStatus.get(appId);
        if (oldStatus?.bundling !== status.bundling) {
          if (status.bundling) {
            this.emit('build-started', { appId, status: 'started' });
          } else {
            this.emit('build-complete', { appId, status: 'success' });
          }
        }
        
        this.metroStatus.set(appId, status);
        this.emit('status-update', { appId, status });
      } else {
        throw new Error(`Metro returned ${response.status}`);
      }
    } catch (error) {
      const status: MetroStatus = {
        running: false,
        port,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: Date.now()
      };
      
      this.metroStatus.set(appId, status);
      this.emit('status-update', { appId, status });
    }
  }
  
  /**
   * Get current Metro status
   */
  getStatus(appId: number): MetroStatus {
    return this.metroStatus.get(appId) || { running: false };
  }
  
  /**
   * Add build log entry
   */
  addLog(appId: number, logEntry: string): void {
    const logs = this.buildLogs.get(appId) || [];
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.shift();
    }
    
    this.buildLogs.set(appId, logs);
  }
  
  /**
   * Clear logs for app
   */
  clearLogs(appId: number): void {
    this.buildLogs.set(appId, []);
  }
  
  /**
   * Unregister Metro
   */
  unregisterMetro(appId: number): void {
    log.info(`📊 Unregistering Metro for app ${appId}`);
    this.stopPolling(appId);
    this.metroPorts.delete(appId);
    this.metroStatus.delete(appId);
    this.buildLogs.delete(appId);
  }
  
  /**
   * Clean up all monitoring
   */
  cleanup(): void {
    log.info('📊 Cleaning up all Metro monitoring');
    for (const [appId] of this.metroPorts) {
      this.unregisterMetro(appId);
    }
  }
}
```

---

### 3. Smart Preview Component

**File:** `src/components/expo/SnackInspiredPreview.tsx`

```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuildStatusBar } from './BuildStatusBar';
import { ErrorOverlay } from './ErrorOverlay';
import { QRCodePanel } from './QRCodePanel';

interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastUpdate?: number;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_FRAMES = {
  mobile: { width: 375, height: 667, label: 'iPhone SE' },
  tablet: { width: 768, height: 1024, label: 'iPad' },
  desktop: { width: 1200, height: 800, label: 'Desktop' }
};

export function SnackInspiredPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ status: 'idle' });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [showQR, setShowQR] = useState(false);
  const [showError, setShowError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Start Expo server and get preview URL
   */
  const startPreview = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      setBuildStatus({ status: 'building', message: 'Starting Expo server...' });
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.expoStart({
        appId: selectedAppId,
        useTunnel: true,
        native: false
      });
      
      if (result.isRunning && result.webUrl) {
        setPreviewUrl(result.webUrl);
        setConnectionStatus({ connected: true, lastUpdate: Date.now() });
        setBuildStatus({ status: 'success', message: 'Ready' });
      } else {
        throw new Error('Failed to start Expo server');
      }
    } catch (error) {
      setBuildStatus({ 
        status: 'error', 
        message: 'Failed to start',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowError(true);
    }
  }, [selectedAppId]);
  
  /**
   * Check Metro bundler status
   */
  const checkStatus = useCallback(async () => {
    if (!selectedAppId) return;
    
    try {
      const ipcClient = IpcClient.getInstance();
      const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
      
      // Update build status
      if (status.buildStatus) {
        setBuildStatus(prev => ({
          ...prev,
          status: status.buildStatus!,
          message: status.buildProgress
        }));
      }
      
      // Update connection status
      setConnectionStatus({
        connected: status.isRunning,
        lastUpdate: Date.now()
      });
      
      // Check for hot reload
      if (status.lastHotReload) {
        // Reload iframe on hot reload
        setIframeKey(prev => prev + 1);
      }
    } catch (error) {
      setConnectionStatus({ connected: false });
    }
  }, [selectedAppId]);
  
  /**
   * Refresh preview
   */
  const refreshPreview = useCallback(() => {
    setIframeKey(prev => prev + 1);
    setBuildStatus({ status: 'building', message: 'Refreshing...' });
    
    setTimeout(() => {
      setBuildStatus({ status: 'success', message: 'Ready' });
    }, 1000);
  }, []);
  
  // Auto-start preview when app is selected
  useEffect(() => {
    if (selectedAppId) {
      startPreview();
    }
    
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [selectedAppId, startPreview]);
  
  // Poll status every 2 seconds
  useEffect(() => {
    if (selectedAppId) {
      statusCheckInterval.current = setInterval(checkStatus, 2000);
      return () => {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
      };
    }
  }, [selectedAppId, checkStatus]);
  
  if (!selectedAppId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Select an app to start preview
          </p>
        </div>
      </div>
    );
  }
  
  const deviceFrame = DEVICE_FRAMES[deviceType];
  
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Top Status Bar */}
      <BuildStatusBar
        buildStatus={buildStatus}
        connectionStatus={connectionStatus}
        onRefresh={refreshPreview}
        onShowQR={() => setShowQR(true)}
      />
      
      {/* Device Type Selector */}
      <div className="flex items-center justify-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant={deviceType === 'mobile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('mobile')}
        >
          <Smartphone className="w-4 h-4 mr-1" />
          Mobile
        </Button>
        <Button
          variant={deviceType === 'tablet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('tablet')}
        >
          <Tablet className="w-4 h-4 mr-1" />
          Tablet
        </Button>
        <Button
          variant={deviceType === 'desktop' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDeviceType('desktop')}
        >
          <Monitor className="w-4 h-4 mr-1" />
          Desktop
        </Button>
      </div>
      
      {/* Preview Frame */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden relative"
          style={{
            width: deviceFrame.width,
            height: deviceFrame.height,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          {previewUrl ? (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Expo Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="camera; microphone; geolocation"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
          
          {/* Error Overlay */}
          {showError && buildStatus.error && (
            <ErrorOverlay
              error={buildStatus.error}
              onClose={() => setShowError(false)}
              onRetry={startPreview}
            />
          )}
        </div>
        
        {/* Device Label */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-full">
          {deviceFrame.label}
        </div>
      </div>
      
      {/* QR Code Modal */}
      {showQR && previewUrl && (
        <QRCodePanel
          url={previewUrl}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
```

---

## 🎨 Supporting Components

### Build Status Bar Component

**File:** `src/components/expo/BuildStatusBar.tsx`

```typescript
import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BuildStatusBarProps {
  buildStatus: {
    status: 'idle' | 'building' | 'success' | 'error';
    message?: string;
  };
  connectionStatus: {
    connected: boolean;
    lastUpdate?: number;
  };
  onRefresh: () => void;
  onShowQR: () => void;
}

export function BuildStatusBar({
  buildStatus,
  connectionStatus,
  onRefresh,
  onShowQR
}: BuildStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Connection Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {connectionStatus.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {/* Build Status */}
      <div className="flex items-center gap-2">
        {buildStatus.status === 'building' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {buildStatus.message || 'Building...'}
            </span>
          </>
        )}
        {buildStatus.status === 'success' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Ready
            </span>
          </>
        )}
        {buildStatus.status === 'error' && (
          <>
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">
              Build Failed
            </span>
          </>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShowQR}>
          <QrCode className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## 🔌 IPC Integration

### Enhanced Expo Handlers

**File:** `src/ipc/handlers/enhanced_expo_handlers.ts`

```typescript
import { ipcMain } from 'electron';
import { ExpoHotReloadManager } from '../../preview/ExpoHotReloadManager';
import { MetroBundlerMonitor } from '../../preview/MetroBundlerMonitor';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import log from 'electron-log';

export function registerEnhancedExpoHandlers() {
  const hotReloadManager = ExpoHotReloadManager.getInstance();
  const metroMonitor = MetroBundlerMonitor.getInstance();
  
  // Start hot reload watching
  ipcMain.handle('expo:start-hot-reload', async (_, { appId }: { appId: number }) => {
    try {
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error('App not found');
      }
      
      const appPath = getDyadAppPath(appData.path);
      hotReloadManager.startWatching(appId, appPath);
      
      return { success: true };
    } catch (error) {
      log.error('Failed to start hot reload:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
  
  // Stop hot reload watching
  ipcMain.handle('expo:stop-hot-reload', async (_, { appId }: { appId: number }) => {
    hotReloadManager.stopWatching(appId);
    return { success: true };
  });
  
  // Register Metro monitoring
  ipcMain.handle('expo:register-metro', async (_, { appId, port }: { appId: number; port: number }) => {
    metroMonitor.registerMetro(appId, port);
    return { success: true };
  });
  
  // Get Metro status
  ipcMain.handle('expo:metro-status', async (_, { appId }: { appId: number }) => {
    return metroMonitor.getStatus(appId);
  });
  
  // Forward hot reload events to renderer
  hotReloadManager.on('hot-reload', (event) => {
    // Broadcast to all renderer windows
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('expo:hot-reload', event);
    });
  });
  
  // Forward Metro status updates
  metroMonitor.on('status-update', ({ appId, status }) => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('expo:metro-status-update', { appId, status });
    });
  });
  
  log.info('✅ Enhanced Expo handlers registered');
}
```

---

## 📋 Integration Checklist

- [ ] Install dependencies: `chokidar`, `qrcode.react`, `ws`
- [ ] Create `ExpoHotReloadManager.ts`
- [ ] Create `MetroBundlerMonitor.ts`
- [ ] Create `SnackInspiredPreview.tsx`
- [ ] Create supporting components (BuildStatusBar, ErrorOverlay, QRCodePanel)
- [ ] Add enhanced IPC handlers
- [ ] Update `PreviewPanel.tsx` to use new component
- [ ] Update `FileEditor.tsx` to trigger hot reload on save
- [ ] Add IPC method definitions to `ipc_client.ts`
- [ ] Test hot reload functionality
- [ ] Test Metro monitoring
- [ ] Test error overlays
- [ ] Test QR code generation
- [ ] Document new features

---

## 🧪 Testing Strategy

### Unit Tests
- `ExpoHotReloadManager` - File watching, debouncing
- `MetroBundlerMonitor` - Status polling, event emission

### Integration Tests
- File change → Hot reload trigger → Preview update
- Metro bundler status → UI update
- Error in build → Error overlay display

### E2E Tests
- Create Expo app → Edit file → See instant preview update
- Start preview → Show QR code → Test on device

---

## 📊 Performance Metrics

| Metric | Target | Current | Improvement |
|--------|--------|---------|-------------|
| Hot reload time | < 500ms | ~2-3s | 80-85% faster |
| File change detection | < 100ms | ~300ms | 66% faster |
| Status update frequency | 2s | 5s | 2.5x more frequent |
| Build status visibility | Real-time | On error only | ∞ improvement |

---

## 🚀 Next Steps

1. **Phase 1 (Week 1):** Implement `ExpoHotReloadManager` and test
2. **Phase 2 (Week 2):** Implement `MetroBundlerMonitor` and integrate
3. **Phase 3 (Week 2-3):** Build `SnackInspiredPreview` component
4. **Phase 4 (Week 3):** Testing and refinement
5. **Phase 5 (Week 4):** Documentation and rollout

