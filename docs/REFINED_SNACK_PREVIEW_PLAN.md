# Refined Snack Preview Implementation Plan
## Focus: Replace ONLY the Preview System (Keep Everything Else)

**Branch:** `feature/expo-preview-improvements`  
**Approach:** Hybrid - Use Snack's preview runtime + Enhance our hot reload  
**Timeline:** 2-3 weeks

---

## 🎯 What We're Keeping (Already Good)

✅ **Monaco Editor** - No changes needed  
✅ **File Tree & Navigation** - Works great  
✅ **IPC Architecture** - Solid foundation  
✅ **Metro Bundler** - Just needs visibility  
✅ **File System** - Local-first approach  

---

## 🔄 What We're Replacing/Enhancing

### 1. Preview System (REPLACE)
**Current:** Basic iframe with manual refresh  
**New:** Snack web player runtime with auto-refresh

### 2. Hot Reload (ENHANCE)
**Current:** Partially working (~60%)  
**New:** 100% reliable with file watching

### 3. Build Status (ADD)
**Current:** Hidden  
**New:** Real-time visible indicators

---

## 🏗 Refined Architecture

```
┌──────────────────┐                    ┌──────────────────┐
│  Monaco Editor   │                    │   File Watcher   │
│  (Keep As-Is)    │                    │   (New - Auto)   │
└──────────────────┘                    └──────────────────┘
         │                                       │
         │ Save File                             │ Detect Changes
         ▼                                       ▼
┌──────────────────────────────────────────────────────────┐
│              IPC Layer (Enhance)                         │
│  - expo:save-and-reload (new)                           │
│  - expo:get-status (enhance)                            │
└──────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│  Metro Bundler   │◀──────────────────▶│  Snack Runtime   │
│  (Existing)      │   Serve Bundle     │  (New Preview)   │
└──────────────────┘                    └──────────────────┘
```

---

## 📦 What We'll Use From Expo Snack

### Option A: Use Snack Web Player (Recommended ⭐⭐⭐⭐⭐)

**Package:** `@expo/snack-runtime` or embed Snack web player

```typescript
// Instead of basic iframe
<iframe src="http://localhost:8081" />

// Use Snack web player
<SnackWebPlayer
  sdkVersion="51.0.0"
  files={fileTree}
  dependencies={dependencies}
  onReady={() => console.log('Preview ready')}
  onError={(error) => console.log('Preview error:', error)}
/>
```

**Benefits:**
- ✅ Same exact preview as snack.expo.dev
- ✅ Built-in error overlays (red box, yellow box)
- ✅ Fast refresh support out of the box
- ✅ Device frame options
- ✅ Console logs visible

---

### Option B: Use Expo Dev Client (Alternative)

Keep using Metro bundler but enhance the preview iframe with:
- WebSocket connection to Metro
- Fast refresh protocol implementation
- Better error handling

---

## 🚀 Recommended Implementation: Option A (Snack Web Player)

### Phase 1: Add Snack Dependencies (Day 1)

```bash
pnpm add snack-sdk
# OR if snack-sdk is too heavy
pnpm add @expo/metro-runtime
```

### Phase 2: Create Snack-Powered Preview Component (Week 1)

**File:** `src/components/expo/SnackPoweredPreview.tsx`

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { IpcClient } from '@/ipc/ipc_client';
import { Snack } from 'snack-sdk';

export function SnackPoweredPreview() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);
  
  // Load app files
  useEffect(() => {
    if (!selectedAppId) return;
    
    const loadFiles = async () => {
      const ipcClient = IpcClient.getInstance();
      const app = await ipcClient.getApp({ appId: selectedAppId });
      
      // Convert file tree to Snack format
      const snackFiles: Record<string, string> = {};
      for (const filePath of app.files) {
        const content = await ipcClient.getAppFile({ 
          appId: selectedAppId, 
          filePath 
        });
        snackFiles[filePath] = content;
      }
      
      setFiles(snackFiles);
    };
    
    loadFiles();
  }, [selectedAppId]);
  
  // Initialize Snack
  useEffect(() => {
    if (Object.keys(files).length === 0) return;
    
    const initSnack = async () => {
      const snackInstance = new Snack({
        files,
        dependencies: getDependencies(files),
        sdkVersion: '51.0.0',
        name: 'Applaa Preview',
        description: 'Live preview powered by Expo Snack',
      });
      
      // Listen for errors
      snackInstance.on('error', (error) => {
        console.error('Snack error:', error);
      });
      
      // Listen for console logs
      snackInstance.on('log', (log) => {
        console.log('Preview log:', log);
      });
      
      setSnack(snackInstance);
      setIsReady(true);
    };
    
    initSnack();
  }, [files]);
  
  // Watch for file changes
  useEffect(() => {
    if (!selectedAppId || !snack) return;
    
    const ipcClient = IpcClient.getInstance();
    
    // Listen for file changes from editor
    const handleFileChange = async (event: any) => {
      const { filePath, content } = event;
      
      // Update Snack with new file content
      await snack.updateFiles({
        [filePath]: { type: 'CODE', contents: content }
      });
      
      console.log('🔥 Hot reload triggered:', filePath);
    };
    
    // Subscribe to file change events
    window.electron.onFileChange(handleFileChange);
    
    return () => {
      window.electron.offFileChange(handleFileChange);
    };
  }, [selectedAppId, snack]);
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Initializing Expo Snack preview...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm">Connected to Expo Snack</span>
        </div>
        <div className="text-sm text-gray-600">
          SDK {snack?.sdkVersion || '51.0.0'}
        </div>
      </div>
      
      {/* Snack Preview */}
      <div className="flex-1">
        <iframe
          src={snack?.getPreviewUrl()}
          className="w-full h-full border-0"
          title="Expo Snack Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="camera; microphone; geolocation"
        />
      </div>
    </div>
  );
}

// Helper: Extract dependencies from package.json
function getDependencies(files: Record<string, string>): Record<string, string> {
  const packageJson = files['package.json'];
  if (!packageJson) return {};
  
  try {
    const pkg = JSON.parse(packageJson);
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}
```

---

## 🔥 Enhanced Hot Reload System (Week 1-2)

Since we're using Snack, we just need to:
1. Watch for file changes
2. Send updates to Snack SDK
3. Snack handles the rest!

**File:** `src/preview/SnackHotReloadBridge.ts`

```typescript
import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import { Snack } from 'snack-sdk';
import log from 'electron-log';

export class SnackHotReloadBridge extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private snack: Snack | null = null;
  
  /**
   * Connect to Snack instance
   */
  connect(snack: Snack, appPath: string) {
    this.snack = snack;
    this.startWatching(appPath);
  }
  
  /**
   * Watch app directory
   */
  private startWatching(appPath: string) {
    this.watcher = chokidar.watch(appPath, {
      ignored: ['**/node_modules/**', '**/.expo/**', '**/dist/**'],
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    
    this.watcher.on('change', async (filePath: string) => {
      if (!this.snack) return;
      
      log.info('🔥 File changed:', filePath);
      
      // Read new file content
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Update Snack
      await this.snack.updateFiles({
        [filePath]: { type: 'CODE', contents: content }
      });
      
      this.emit('reload', { filePath, timestamp: Date.now() });
    });
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.snack = null;
  }
}
```

---

## 📊 Side-by-Side Comparison

### Before (Current Applaa)
```typescript
// Basic iframe
<iframe src="http://localhost:8081" />

// Manual refresh needed
<button onClick={() => window.location.reload()}>Refresh</button>

// No error overlays
// No hot reload reliability
// No build status
```

### After (Snack-Powered)
```typescript
// Snack preview
<SnackWebPlayer
  files={files}
  sdkVersion="51.0.0"
  onError={(err) => showErrorOverlay(err)}
  onLog={(log) => addToConsole(log)}
/>

// Auto-refresh on file changes
snack.updateFiles({ [path]: content });

// Built-in error overlays ✅
// 100% reliable hot reload ✅
// Real-time build status ✅
```

---

## 🎨 UI Enhancement: Snack-Style Preview Panel

```typescript
// src/components/expo/SnackStylePreviewPanel.tsx
export function SnackStylePreviewPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Top Bar - Like Snack */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Running</span>
          </div>
          
          {/* Build Status */}
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">Building...</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">
            <QrCode className="w-4 h-4 inline mr-1" />
            QR Code
          </button>
          <button className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300">
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Restart
          </button>
        </div>
      </div>
      
      {/* Device Frame Options */}
      <div className="flex items-center justify-center gap-2 p-2 border-b">
        <button className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700">
          <Smartphone className="w-4 h-4 inline mr-1" />
          iOS
        </button>
        <button className="px-3 py-1 text-sm rounded-md hover:bg-gray-100">
          <Smartphone className="w-4 h-4 inline mr-1" />
          Android
        </button>
        <button className="px-3 py-1 text-sm rounded-md hover:bg-gray-100">
          <Monitor className="w-4 h-4 inline mr-1" />
          Web
        </button>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
        <SnackPoweredPreview />
      </div>
      
      {/* Console (Optional) */}
      <div className="h-32 border-t bg-black text-green-400 p-2 font-mono text-xs overflow-auto">
        <div>› npm start</div>
        <div>› Expo DevTools running at http://localhost:19002</div>
        <div className="text-yellow-400">⚠ Warning: Remote debugger is in a background tab</div>
        <div className="text-blue-400">ℹ Fast Refresh enabled</div>
      </div>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Week 1: Snack Integration
- [ ] Install `snack-sdk` package
- [ ] Create `SnackPoweredPreview.tsx` component
- [ ] Add file loading logic
- [ ] Test basic preview rendering
- [ ] Add Snack initialization

### Week 2: Hot Reload Bridge
- [ ] Create `SnackHotReloadBridge.ts`
- [ ] Implement file watching with chokidar
- [ ] Connect file changes to Snack SDK
- [ ] Test hot reload reliability
- [ ] Add debouncing

### Week 3: UI Polish
- [ ] Create status bar component
- [ ] Add device frame selector
- [ ] Add QR code panel
- [ ] Add console panel (optional)
- [ ] Test complete flow

---

## 🎯 Expected Results

| Feature | Before | After (Snack-Powered) |
|---------|--------|---------------------|
| **Preview Quality** | Basic iframe | ⭐ Same as snack.expo.dev |
| **Hot Reload** | ~60% reliable | ✅ 100% reliable |
| **Reload Time** | 2-3 seconds | ⚡ < 500ms |
| **Error Display** | Terminal only | 🎨 Beautiful red box overlays |
| **Console Logs** | Hidden | 📝 Visible in preview |
| **Build Status** | Hidden | 📊 Real-time indicator |
| **Device Testing** | Manual QR | 📱 Built-in QR panel |

---

## 💡 Key Advantages of This Approach

1. **Same Preview as Expo Snack** - Exact same rendering engine
2. **No Reinventing Wheel** - Use Snack's battle-tested code
3. **Keep Our Strengths** - Monaco editor, IPC, file system
4. **Fast Implementation** - 2-3 weeks vs 4-6 weeks
5. **Professional Quality** - Expo's production code
6. **Easy Maintenance** - Expo maintains the preview runtime

---

## 🔗 Next Steps

1. **Install Snack SDK**
   ```bash
   pnpm add snack-sdk
   ```

2. **Create Initial Component**
   - Start with basic `SnackPoweredPreview.tsx`
   - Test file loading
   - Verify preview renders

3. **Add Hot Reload**
   - Implement `SnackHotReloadBridge.ts`
   - Connect file watcher
   - Test reliability

4. **Polish UI**
   - Add status indicators
   - Add device frames
   - Add QR code support

---

## 🚀 Let's Start!

Ready to implement? We can start with:
1. Installing `snack-sdk`
2. Creating the basic preview component
3. Testing with a simple Expo app

This will give us **the exact same preview experience as snack.expo.dev** while keeping everything else that works! 🎉

