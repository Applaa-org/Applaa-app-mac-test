# Migration Guide: Legacy to Unified Preview System

🔄 **Seamless Transition** - Step-by-step guide to migrate from legacy preview components to the new unified system.

## Overview

This guide helps you migrate from the legacy preview system to the new Quest-inspired unified preview system while maintaining full backward compatibility.

## Migration Strategy

The migration follows a **gradual approach**:

1. **Phase 1**: Install unified system alongside legacy (✅ **COMPLETED**)
2. **Phase 2**: Update components to use MigrationAdapter (✅ **COMPLETED**)
3. **Phase 3**: Gradually migrate to native unified APIs
4. **Phase 4**: Remove legacy components

## Current Status

✅ **Unified System Installed**: Core components are ready  
✅ **Migration Adapter Active**: Backward compatibility enabled  
✅ **PreviewPanel Updated**: Using unified system with fallback  
🔄 **Testing Phase**: Validating functionality  
⏳ **Documentation**: Comprehensive guides available  

## Component Migration Map

### Legacy → Unified Mapping

| Legacy Component | Unified Equivalent | Migration Status |
|------------------|-------------------|------------------|
| `UnifiedExpoPreview` | `UnifiedPreviewManager` (Expo) | ✅ Adapter Ready |
| `IntelligentPreviewPanel` | `UnifiedPreviewManager` (React) | ✅ Adapter Ready |
| `PreviewPanel` | Enhanced with Unified System | ✅ **COMPLETED** |
| `AutoStartPreview` | `PreviewControlPlane.autoStart` | 🔄 Available |
| `PreviewHeader` | Enhanced with Status Indicators | 🔄 Available |

## Step-by-Step Migration

### Step 1: Understanding the New Architecture

```typescript
// OLD: Multiple separate systems
import { UnifiedExpoPreview } from '@/components/expo/UnifiedExpoPreview';
import { IntelligentPreviewPanel } from '@/components/expo/IntelligentPreviewPanel';

// NEW: Single unified system
import { 
  createUnifiedPreviewManager,
  getMigrationAdapter,
  LegacyPreviewAPI 
} from '@/preview';
```

### Step 2: Using Migration Adapter (Current Phase)

**✅ Already Implemented in PreviewPanel.tsx**

```typescript
// Current implementation in PreviewPanel.tsx
const [unifiedPreviewEnabled, setUnifiedPreviewEnabled] = useState(false);
const [previewSystemStatus, setPreviewSystemStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

const migrationAdapter = useMemo(() => getMigrationAdapter(), []);

// Initialization
useEffect(() => {
  const initializeUnifiedSystem = async () => {
    try {
      setPreviewSystemStatus('initializing');
      await migrationAdapter.initialize();
      setPreviewSystemStatus('ready');
      setUnifiedPreviewEnabled(true);
    } catch (error) {
      console.error('Failed to initialize unified preview system:', error);
      setPreviewSystemStatus('error');
      setUnifiedPreviewEnabled(false); // Fallback to legacy
    }
  };
  
  initializeUnifiedSystem();
}, [migrationAdapter]);
```

### Step 3: App Lifecycle Management

**✅ Already Implemented with Dual Support**

```typescript
// Current implementation supports both systems
if (unifiedPreviewEnabled) {
  // 🚀 NEW: Use unified preview system
  const appType: AppType = isExpoApp ? 'expo' : 'react';
  migrationAdapter.startApp(currentAppId, {
    type: appType,
    name: app?.name || currentAppId,
    path: app?.path || '',
    config: {
      port: app?.port,
      env: app?.env || {},
      buildCommand: app?.buildCommand,
      startCommand: app?.startCommand
    }
  }).catch(console.error);
} else {
  // Legacy system fallback
  if (isExpoApp) {
    // BattleTestedExpoPreview handles Expo apps
  } else {
    startApp(currentAppId);
  }
}
```

### Step 4: Performance Monitoring Integration

**✅ Already Implemented**

```typescript
// Performance monitoring setup
const unifiedManager = migrationAdapter.getUnifiedManager();
const performanceMonitor = unifiedManager.getPerformanceMonitor();

// Listen for performance updates
const handlePerformanceUpdate = (metrics: any) => {
  setPerformanceMetrics(metrics);
};

unifiedManager.on('performance:update', handlePerformanceUpdate);
```

### Step 5: UI Status Indicators

**✅ Already Implemented**

```typescript
// System status indicators in header
{unifiedPreviewEnabled && (
  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20">
    <Zap size={12} className="text-green-600 dark:text-green-400" />
    <span className="text-xs font-medium text-green-700 dark:text-green-300">
      Unified
    </span>
    {performanceMetrics && (
      <span className="text-xs text-green-600 dark:text-green-400">
        {Math.round(performanceMetrics.memoryUsage || 0)}MB
      </span>
    )}
  </div>
)}

{/* System Status Indicator */}
<div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
  previewSystemStatus === 'ready' ? 'bg-green-50 text-green-700' :
  previewSystemStatus === 'initializing' ? 'bg-yellow-50 text-yellow-700' :
  previewSystemStatus === 'error' ? 'bg-red-50 text-red-700' :
  'bg-gray-50 text-gray-600'
}`}>
  <Activity size={12} className={`${
    previewSystemStatus === 'ready' ? 'text-green-600' :
    previewSystemStatus === 'initializing' ? 'text-yellow-600 animate-pulse' :
    previewSystemStatus === 'error' ? 'text-red-600' :
    'text-gray-500'
  }`} />
  <span className="font-medium capitalize">{previewSystemStatus}</span>
</div>
```

## Next Steps (Future Phases)

### Phase 3: Native Unified API Migration

```typescript
// Future: Direct unified API usage
import { createUnifiedPreviewManager } from '@/preview';

const PreviewComponent = () => {
  const [manager] = useState(() => createUnifiedPreviewManager({
    maxConcurrentApps: 3,
    enablePerformanceMonitoring: true,
    cacheEnabled: true
  }));

  const startApp = async (appId: string, config: PreviewAppConfig) => {
    await manager.startApp(appId, config);
  };

  const stopApp = async (appId: string) => {
    await manager.stopApp(appId);
  };

  return (
    // Component JSX
  );
};
```

### Phase 4: Legacy Component Removal

```typescript
// Remove legacy imports
// ❌ Remove: import { UnifiedExpoPreview } from '@/components/expo/UnifiedExpoPreview';
// ❌ Remove: import { IntelligentPreviewPanel } from '@/components/expo/IntelligentPreviewPanel';

// Keep only unified imports
// ✅ Keep: import { createUnifiedPreviewManager } from '@/preview';
```

## Migration Checklist

### ✅ Phase 1 & 2 (COMPLETED)

- [x] Install unified preview system
- [x] Create migration adapter
- [x] Update PreviewPanel.tsx
- [x] Add performance monitoring
- [x] Add status indicators
- [x] Implement dual system support
- [x] Add error handling and fallbacks
- [x] Test TypeScript compilation
- [x] Verify preview functionality

### 🔄 Phase 3 (Future)

- [ ] Migrate individual components to native unified API
- [ ] Update AutoStartPreview component
- [ ] Enhance PreviewHeader with unified features
- [ ] Add advanced caching configuration
- [ ] Implement resource optimization

### ⏳ Phase 4 (Future)

- [ ] Remove legacy component dependencies
- [ ] Clean up migration adapter (optional)
- [ ] Update all import statements
- [ ] Remove unused legacy code
- [ ] Final testing and validation

## Testing Strategy

### Current Testing (✅ COMPLETED)

1. **TypeScript Compilation**: ✅ Passed
2. **Preview Functionality**: ✅ Working
3. **Backward Compatibility**: ✅ Maintained
4. **Error Handling**: ✅ Implemented

### Future Testing

1. **Performance Benchmarks**
   ```bash
   npm run test:performance
   ```

2. **Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **E2E Tests**
   ```bash
   npm run e2e:preview
   ```

## Rollback Strategy

If issues arise, the system automatically falls back to legacy components:

```typescript
// Automatic fallback on error
catch (error) {
  console.error('Failed to initialize unified preview system:', error);
  setPreviewSystemStatus('error');
  setUnifiedPreviewEnabled(false); // 🔄 Automatic fallback
}
```

## Performance Benefits

### Before (Legacy System)
- Multiple separate preview managers
- No resource pooling
- Limited performance monitoring
- Manual cache management

### After (Unified System)
- ✅ Single point of control
- ✅ Intelligent resource pooling
- ✅ Real-time performance monitoring
- ✅ Smart caching with LRU eviction
- ✅ Automatic optimization recommendations

## Troubleshooting Migration Issues

### Issue: Unified System Not Initializing

**Symptoms**: Status shows 'error', falls back to legacy

**Solution**:
```typescript
// Check browser console for detailed error messages
// Verify all dependencies are installed
// Ensure TypeScript compilation passes
```

### Issue: Performance Metrics Not Updating

**Symptoms**: Performance indicators show no data

**Solution**:
```typescript
// Verify performance monitoring is enabled
const manager = createUnifiedPreviewManager({
  enablePerformanceMonitoring: true // ✅ Ensure this is true
});
```

### Issue: Apps Not Starting in Unified Mode

**Symptoms**: Apps start in legacy mode despite unified being enabled

**Solution**:
```typescript
// Check app configuration format
const appConfig: PreviewAppConfig = {
  type: 'react', // ✅ Ensure correct type
  name: 'My App',
  path: '/correct/path',
  config: {
    port: 3000,
    env: {}
  }
};
```

## Support and Resources

- **Documentation**: `/src/preview/README.md`
- **API Reference**: `/src/preview/types.ts`
- **Examples**: `/src/preview/examples/`
- **Issues**: Check browser console and terminal output

## Migration Timeline

- **✅ Phase 1-2**: Completed - Unified system with backward compatibility
- **🔄 Phase 3**: Q1 2024 - Native API migration
- **⏳ Phase 4**: Q2 2024 - Legacy cleanup

---

**Status**: ✅ **Migration Phase 1-2 COMPLETED Successfully**

The unified preview system is now active with full backward compatibility. The system automatically detects and uses the new unified architecture while maintaining fallback support for legacy components.