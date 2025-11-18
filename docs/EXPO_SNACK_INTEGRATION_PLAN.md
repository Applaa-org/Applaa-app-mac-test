# Expo Snack Integration Plan for Applaa
## Comprehensive Analysis & Implementation Strategy

**Branch:** `feature/expo-preview-improvements`  
**Date:** October 5, 2025  
**Reference:** https://github.com/expo/snack

---

## 📋 Executive Summary

### Current State Analysis

**Applaa's Existing Expo System:**
- ✅ **Monaco Editor** - Professional code editor (same as VS Code)
- ✅ **Multiple Preview Components** - 5+ preview implementations
- ✅ **File Tree & Navigation** - Good file management
- ⚠️ **Hot Reload** - Partially working, not reliable
- ⚠️ **Preview Sync** - Manual refresh often needed
- ❌ **Metro Bundler Visibility** - Hidden from users
- ❌ **Build Status** - Not clearly communicated

**Expo Snack Features:**
- ✅ **Real-time Preview** - Code changes auto-refresh instantly
- ✅ **Web Player** - Browser-based React Native runtime
- ✅ **Mobile Testing** - QR code for device testing
- ✅ **Package Bundler** - Snackager for dependencies
- ✅ **Error Handling** - Clear error messages in preview
- ✅ **Build Status** - Visual indicators for bundling

---

## 🎯 Integration Options

### Option 1: Full Expo Snack SDK Integration ⭐⭐⭐

**Approach:** Replace Applaa's preview system with Expo Snack SDK

**Architecture:**
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Monaco Editor  │─────▶│  Snack SDK Core  │─────▶│ Snack Web Player│
│   (Keep As-Is)  │      │  (npm: snack-sdk) │      │   (iframe)      │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

**Pros:**
- ✅ Professional, battle-tested solution
- ✅ Instant hot reload (Snack's specialty)
- ✅ Built-in error handling
- ✅ Mobile device support via QR codes
- ✅ Handles complex Expo dependencies

**Cons:**
- ❌ Heavy dependency (~10MB+ SDK)
- ❌ Requires Expo Snack API (might need backend)
- ❌ May conflict with Applaa's file system approach
- ❌ Less control over customization
- ❌ Overkill for local development

**Implementation Complexity:** 🔴 High (4-6 weeks)

**Dependencies to Add:**
```json
{
  "snack-sdk": "^4.0.0",
  "@snack/runtime": "^1.0.0"
}
```

---

### Option 2: Snack-Inspired Enhancement ⭐⭐⭐⭐⭐ (RECOMMENDED)

**Approach:** Keep existing architecture, enhance with Snack's best practices

**What to Keep:**
- ✅ Monaco Editor (already excellent)
- ✅ Electron IPC architecture
- ✅ Local file system approach
- ✅ Metro bundler integration

**What to Improve (Snack-Inspired):**
1. **Enhanced Hot Reload** - Make it 100% reliable
2. **Better Preview Frame** - Snack-like iframe communication
3. **Build Status Indicators** - Visual Metro bundler status
4. **Error Overlays** - In-preview error display
5. **QR Code Generation** - Mobile device testing
6. **Connection Status** - Real-time connection indicators

**Architecture:**
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Monaco Editor  │      │  Enhanced IPC    │      │  Smart Preview  │
│   (Existing)    │─────▶│  Hot Reload      │─────▶│  Frame (New)    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                        │                          │
        │                        ▼                          │
        │              ┌──────────────────┐                 │
        │              │ Metro Bundler    │                 │
        └─────────────▶│ Status Monitor   │◀────────────────┘
                       └──────────────────┘
```

**Pros:**
- ✅ Lightweight, no heavy dependencies
- ✅ Full control over behavior
- ✅ Fits existing Applaa architecture
- ✅ Easier to debug and maintain
- ✅ Can iterate quickly

**Cons:**
- ⚠️ Need to implement features ourselves
- ⚠️ Takes more initial development time

**Implementation Complexity:** 🟡 Medium (2-3 weeks)

---

### Option 3: Hybrid Approach ⭐⭐⭐⭐

**Approach:** Use Snack runtime for preview only, keep our editor

**Architecture:**
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Monaco Editor  │      │   File System    │      │  Snack Runtime  │
│   (Existing)    │─────▶│   Bridge Layer   │─────▶│   (Web Player)  │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

**Implementation:**
- Keep Monaco Editor for code editing
- Use `@snack/runtime` NPM package for preview
- Create bridge layer to sync file changes
- Local Metro bundler feeds into Snack runtime

**Pros:**
- ✅ Professional preview experience
- ✅ Keep our existing editor
- ✅ Lighter than full SDK
- ✅ Best preview quality

**Cons:**
- ⚠️ Still adds external dependency
- ⚠️ Bridge layer complexity
- ⚠️ May have sync delays

**Implementation Complexity:** 🟡 Medium-High (3-4 weeks)

---

## 🏆 Recommended Approach: Option 2 (Snack-Inspired Enhancement)

### Why Option 2?

1. **Aligns with Applaa Philosophy** - Local-first, full control
2. **Faster Development** - Build on existing foundation
3. **Easier Maintenance** - No external SDK to update
4. **Better Integration** - Works seamlessly with IPC handlers
5. **User Experience** - Same quality as Snack, Applaa-optimized

---

## 🛠 Implementation Plan: Snack-Inspired Enhancement

### Phase 1: Enhanced Hot Reload System (Week 1)

**Goal:** Make hot reload 100% reliable like Snack

**Current Issues:**
```typescript
// src/ipc/handlers/app_handlers.ts:1501-1508
// Only triggers on manual file edits
try {
  const { triggerExpoHotReload } = await import("./expo_handlers");
  await triggerExpoHotReload();
} catch (reloadError) {
  logger.warn("Failed to trigger hot reload:", reloadError);
}
```

**Improvements:**

1. **File System Watcher** - React to ALL file changes
```typescript
// New file: src/preview/ExpoHotReloadManager.ts
import chokidar from 'chokidar';

export class ExpoHotReloadManager {
  private watchers = new Map<number, FSWatcher>();
  
  startWatching(appId: number, appPath: string) {
    const watcher = chokidar.watch(appPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    
    watcher.on('change', async (filePath) => {
      console.log(`🔥 File changed: ${filePath}`);
      await this.triggerHotReload(appId, filePath);
    });
    
    this.watchers.set(appId, watcher);
  }
  
  async triggerHotReload(appId: number, changedFile: string) {
    // Notify Metro bundler
    // Update preview frame
    // Broadcast to renderer
  }
}
```

2. **WebSocket Connection** - Real-time preview updates
```typescript
// src/preview/PreviewWebSocket.ts
export class PreviewWebSocket {
  sendHotReload(type: 'full' | 'fast-refresh') {
    this.ws.send(JSON.stringify({
      type: 'hot-reload',
      reloadType: type,
      timestamp: Date.now()
    }));
  }
}
```

### Phase 2: Smart Preview Frame (Week 1-2)

**Goal:** Snack-like preview experience

**New Component:**
```typescript
// src/components/expo/SnackInspiredPreview.tsx
import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error';
  progress?: number;
  message?: string;
}

export function SnackInspiredPreview() {
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ status: 'idle' });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Real-time Metro bundler status
  useEffect(() => {
    const ipcClient = IpcClient.getInstance();
    const interval = setInterval(async () => {
      const status = await ipcClient.getExpoStatus({ appId });
      setBuildStatus({
        status: status.buildStatus || 'idle',
        message: status.buildProgress
      });
    }, 1000); // Update every second like Snack
    
    return () => clearInterval(interval);
  }, [appId]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Top Status Bar - Snack Style */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b">
        <div className="flex items-center gap-2">
          {/* Connection Indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm">
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {/* Build Status */}
        <div className="flex items-center gap-2">
          {buildStatus.status === 'building' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{buildStatus.message || 'Building...'}</span>
            </>
          )}
          {buildStatus.status === 'success' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {buildStatus.status === 'error' && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
        
        {/* Device Options */}
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
            QR Code
          </button>
          <button className="px-2 py-1 text-xs bg-gray-200 rounded">
            Refresh
          </button>
        </div>
      </div>
      
      {/* Preview Frame */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="camera; microphone; geolocation"
        />
        
        {/* Error Overlay - Snack Style */}
        {buildStatus.status === 'error' && (
          <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <div className="max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Build Error
              </h3>
              <pre className="text-sm overflow-auto max-h-96">
                {buildStatus.message}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Phase 3: Metro Bundler Status Monitor (Week 2)

**Goal:** Make Metro bundler visible and controllable

**New Monitor:**
```typescript
// src/preview/MetroBundlerMonitor.ts
export class MetroBundlerMonitor {
  private metroPorts = new Map<number, number>();
  private buildLogs = new Map<number, string[]>();
  
  async getMetroStatus(appId: number) {
    const port = this.metroPorts.get(appId);
    if (!port) return { running: false };
    
    try {
      // Check Metro health endpoint
      const response = await fetch(`http://localhost:${port}/status`);
      const data = await response.json();
      
      return {
        running: true,
        port,
        version: data.version,
        bundling: data.bundleInProgress,
        logs: this.buildLogs.get(appId) || []
      };
    } catch (error) {
      return { running: false, error: error.message };
    }
  }
  
  async restartMetro(appId: number) {
    // Kill existing Metro process
    // Start fresh Metro instance
    // Return new status
  }
}
```

### Phase 4: Enhanced Error Display (Week 2-3)

**Features:**
- In-preview error overlays (like Snack)
- Syntax highlighting for error messages
- Clickable stack traces
- Auto-fix suggestions

### Phase 5: QR Code & Mobile Testing (Week 3)

**Implementation:**
```typescript
// Enhanced QR code generation with tunnel support
export function QRCodePanel({ expoUrl }: { expoUrl: string }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-sm font-semibold mb-2">Scan to test on device</h3>
      <QRCodeSVG value={expoUrl} size={200} />
      <p className="text-xs text-gray-500 mt-2">{expoUrl}</p>
    </div>
  );
}
```

---

## 📊 Feature Comparison: Before vs After

| Feature | Before | After (Snack-Inspired) |
|---------|--------|----------------------|
| **Hot Reload** | ⚠️ Sometimes works | ✅ Instant & reliable |
| **Build Status** | ❌ Hidden | ✅ Real-time indicator |
| **Error Display** | ⚠️ Terminal only | ✅ In-preview overlay |
| **Connection Status** | ❌ No visibility | ✅ Live indicator |
| **Metro Control** | ❌ No access | ✅ Restart button |
| **Mobile Testing** | ⚠️ Basic QR | ✅ Enhanced QR panel |
| **Preview Sync** | ⚠️ Manual refresh | ✅ Auto-sync |
| **Code Editor** | ✅ Monaco | ✅ Monaco (unchanged) |

---

## 🎨 UI Mockup: Snack-Inspired Layout

```
┌────────────────────────────────────────────────────────────────┐
│  ●●● Applaa                                    [Connected ●]   │
├──────────────────┬─────────────────────────────────────────────┤
│  Files           │  Code Editor (Monaco)                       │
│  ├─ app/         │  ┌──────────────────────────────────────┐  │
│  │  ├─ index.tsx │  │ import React from 'react';           │  │
│  │  └─ _layout.tsx  │                                      │  │
│  ├─ components/  │  │ export default function App() {     │  │
│  └─ package.json │  │   return <View>...</View>           │  │
│                  │  └──────────────────────────────────────┘  │
├──────────────────┼─────────────────────────────────────────────┤
│                  │  Preview                                    │
│                  │  ┌─────────────────────────────────┐       │
│                  │  │ [Building... ⏳] [QR Code] [⟳]  │       │
│                  │  ├─────────────────────────────────┤       │
│                  │  │                                 │       │
│                  │  │    📱 iPhone 14 Pro            │       │
│                  │  │    ┌─────────────────────┐    │       │
│                  │  │    │                     │    │       │
│                  │  │    │   Your App Here     │    │       │
│                  │  │    │                     │    │       │
│                  │  │    └─────────────────────┘    │       │
│                  │  │                                 │       │
│                  │  └─────────────────────────────────┘       │
└──────────────────┴─────────────────────────────────────────────┘
```

---

## 📦 Dependencies to Add

```json
{
  "chokidar": "^3.5.3",  // File watching
  "qrcode.react": "^3.1.0",  // QR code generation
  "ws": "^8.14.2"  // WebSocket for preview communication
}
```

---

## 🚀 Implementation Timeline

| Week | Tasks | Deliverables |
|------|-------|--------------|
| **Week 1** | Enhanced hot reload + File watcher | ✅ Reliable auto-refresh |
| **Week 2** | Smart preview frame + Metro monitor | ✅ Snack-like UI |
| **Week 3** | Error overlays + QR code panel | ✅ Complete experience |
| **Week 4** | Testing + Bug fixes | ✅ Production ready |

---

## ✅ Success Metrics

1. **Hot Reload Reliability:** 100% (from ~60%)
2. **Preview Sync Time:** < 500ms (from ~2-3s)
3. **Error Visibility:** In-preview (from terminal only)
4. **User Satisfaction:** "Feels like Snack" ⭐⭐⭐⭐⭐

---

## 🔗 References

- **Expo Snack GitHub:** https://github.com/expo/snack
- **Snack SDK Docs:** https://github.com/expo/snack/tree/main/packages/snack-sdk
- **Current Applaa Implementation:** 
  - `src/components/expo/BattleTestedExpoPreview.tsx`
  - `src/ipc/handlers/expo_handlers.ts`
  - `src/components/preview_panel/FileEditor.tsx`

---

## 🎯 Next Steps

1. **Get Approval** - Review this plan with team
2. **Start Phase 1** - Implement enhanced hot reload
3. **Prototype UI** - Build Snack-inspired preview component
4. **Test & Iterate** - Ensure reliability
5. **Document** - Create user guides

---

## 💡 Alternative: Quick Win Strategy

If full implementation takes too long, prioritize:

1. **Week 1 Quick Wins:**
   - Fix existing hot reload reliability
   - Add build status indicator
   - Improve QR code panel

2. **Week 2 Enhancement:**
   - Better error overlays
   - Connection status indicator

This gives 80% of Snack's benefits with 20% of the effort! 🚀

