# Unified Preview System

🚀 **Quest-Inspired Architecture** - A modern, scalable preview system inspired by `@quests/workspace` and `@quests/shim-client` patterns.

## Overview

The Unified Preview System provides a centralized, intelligent approach to managing preview applications across different frameworks (React, Expo, etc.) with advanced features like resource pooling, performance monitoring, and smart caching.

## Architecture

### Core Components

```
src/preview/
├── UnifiedPreviewManager.ts    # Central orchestrator
├── PreviewControlPlane.ts      # App lifecycle management
├── SmartCacheManager.ts        # Intelligent caching
├── ResourceManager.ts          # Resource allocation
├── PerformanceMonitor.ts       # Performance tracking
├── MigrationAdapter.ts         # Backward compatibility
├── types.ts                    # Type definitions
└── index.ts                    # Public API
```

### Key Features

- **🎯 Single Point of Control**: Unified management for all preview types
- **⚡ On-Demand Loading**: Apps load only when needed
- **🔄 Resource Pooling**: Efficient resource allocation and reuse
- **📊 Performance Monitoring**: Real-time metrics and optimization
- **💾 Smart Caching**: Intelligent build artifact caching
- **🔄 Backward Compatibility**: Seamless migration from legacy systems

## Quick Start

### Basic Usage

```typescript
import { createUnifiedPreviewManager } from '@/preview';

// Create manager instance
const manager = createUnifiedPreviewManager({
  maxConcurrentApps: 3,
  enablePerformanceMonitoring: true,
  cacheEnabled: true
});

// Start an app
await manager.startApp('my-app', {
  type: 'react',
  name: 'My React App',
  path: '/path/to/app',
  config: {
    port: 3000,
    env: { NODE_ENV: 'development' }
  }
});

// Monitor performance
manager.on('performance:update', (metrics) => {
  console.log('Memory usage:', metrics.memoryUsage);
  console.log('Load time:', metrics.loadTime);
});
```

### Migration from Legacy System

```typescript
import { getMigrationAdapter, LegacyPreviewAPI } from '@/preview';

// Use migration adapter for backward compatibility
const adapter = getMigrationAdapter();

// Legacy API still works
LegacyPreviewAPI.startExpoApp('expo-app-id');
LegacyPreviewAPI.startIntelligentPreview('react-app-id');
```

## API Reference

### UnifiedPreviewManager

The central manager for all preview operations.

#### Methods

- `startApp(id, config)` - Start a preview app
- `stopApp(id)` - Stop a preview app
- `suspendApp(id)` - Suspend app (keep in memory)
- `resumeApp(id)` - Resume suspended app
- `getAppState(id)` - Get current app state
- `getAllApps()` - Get all managed apps
- `getPerformanceMetrics()` - Get system performance metrics

#### Events

- `app:started` - App successfully started
- `app:stopped` - App stopped
- `app:error` - App encountered error
- `performance:update` - Performance metrics updated
- `resource:allocated` - Resource allocated to app
- `cache:hit` - Cache hit occurred

### PreviewControlPlane

Manages app lifecycle and system coordination.

```typescript
const controlPlane = new PreviewControlPlane();

// Start app with specific configuration
await controlPlane.startApp('app-id', {
  type: 'expo',
  port: 19006,
  env: { EXPO_DEV_CLIENT: 'true' }
});

// Monitor app health
controlPlane.on('health:check', (appId, status) => {
  console.log(`App ${appId} health:`, status);
});
```

### SmartCacheManager

Intelligent caching for build artifacts and dependencies.

```typescript
const cacheManager = new SmartCacheManager();

// Cache build artifacts
await cacheManager.set('app-build-123', buildArtifacts, {
  tags: ['build', 'production'],
  ttl: 3600000 // 1 hour
});

// Retrieve from cache
const cached = await cacheManager.get('app-build-123');

// Invalidate by tags
await cacheManager.invalidateByTags(['build']);
```

### ResourceManager

Manages system resources and allocation.

```typescript
const resourceManager = new ResourceManager({
  maxMemoryMB: 2048,
  maxCpuPercent: 80,
  portRange: { start: 3000, end: 4000 }
});

// Allocate resources for app
const resources = await resourceManager.allocateResources('app-id', {
  memoryMB: 512,
  cpuPercent: 25
});
```

### PerformanceMonitor

Real-time performance tracking and optimization.

```typescript
const monitor = new PerformanceMonitor();

// Start monitoring an app
monitor.startMonitoring('app-id');

// Get performance report
const report = await monitor.generateReport('app-id');
console.log('Load time:', report.averageLoadTime);
console.log('Memory usage:', report.memoryUsage);
console.log('Health score:', report.healthScore);
```

## Configuration

### Manager Configuration

```typescript
interface PreviewManagerConfig {
  maxConcurrentApps: number;           // Max apps running simultaneously
  enablePerformanceMonitoring: boolean; // Enable performance tracking
  cacheEnabled: boolean;               // Enable smart caching
  resourceLimits: {
    maxMemoryMB: number;               // Max memory per app
    maxCpuPercent: number;             // Max CPU per app
  };
  portRange: {
    start: number;                     // Port range start
    end: number;                       // Port range end
  };
}
```

### App Configuration

```typescript
interface PreviewAppConfig {
  type: 'react' | 'expo' | 'vue' | 'angular';
  name: string;
  path: string;
  config: {
    port?: number;
    env?: Record<string, string>;
    buildCommand?: string;
    startCommand?: string;
    healthCheckUrl?: string;
  };
}
```

## Performance Optimization

### Resource Pooling

The system automatically pools resources to minimize startup times:

- **Port Pool**: Pre-allocated ports for quick assignment
- **Memory Pool**: Reserved memory blocks for apps
- **Process Pool**: Reusable process instances

### Smart Caching

Intelligent caching strategies:

- **Build Artifacts**: Cache compiled assets
- **Dependencies**: Cache node_modules and similar
- **Configuration**: Cache parsed config files
- **LRU Eviction**: Automatic cleanup of old cache entries

### Performance Monitoring

Real-time metrics collection:

- **Load Times**: App startup and page load times
- **Memory Usage**: Real-time memory consumption
- **CPU Usage**: Process CPU utilization
- **Network**: Request/response metrics
- **Health Scores**: Overall app health assessment

## Migration Guide

### From Legacy Expo Preview

```typescript
// Before (Legacy)
import { UnifiedExpoPreview } from '@/components/expo/UnifiedExpoPreview';

// After (Unified)
import { getMigrationAdapter } from '@/preview';
const adapter = getMigrationAdapter();
await adapter.startApp('expo-app', { type: 'expo', ... });
```

### From Legacy Intelligent Preview

```typescript
// Before (Legacy)
import { IntelligentPreviewPanel } from '@/components/expo/IntelligentPreviewPanel';

// After (Unified)
import { createUnifiedPreviewManager } from '@/preview';
const manager = createUnifiedPreviewManager();
await manager.startApp('react-app', { type: 'react', ... });
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```typescript
   // Solution: Configure port range
   const manager = createUnifiedPreviewManager({
     portRange: { start: 4000, end: 5000 }
   });
   ```

2. **Memory Issues**
   ```typescript
   // Solution: Adjust resource limits
   const manager = createUnifiedPreviewManager({
     resourceLimits: { maxMemoryMB: 1024 }
   });
   ```

3. **Cache Issues**
   ```typescript
   // Solution: Clear cache
   const cacheManager = manager.getCacheManager();
   await cacheManager.clear();
   ```

### Debug Mode

```typescript
// Enable debug logging
const manager = createUnifiedPreviewManager({
  debug: true,
  logLevel: 'verbose'
});

// Listen for debug events
manager.on('debug', (message) => {
  console.log('[DEBUG]', message);
});
```

## Best Practices

1. **Resource Management**
   - Set appropriate resource limits
   - Monitor memory usage regularly
   - Use suspension for inactive apps

2. **Performance**
   - Enable caching for production builds
   - Use performance monitoring in development
   - Optimize app startup sequences

3. **Error Handling**
   - Always handle app start/stop errors
   - Implement retry logic for failed operations
   - Monitor app health continuously

4. **Migration**
   - Use MigrationAdapter for gradual migration
   - Test thoroughly before full migration
   - Keep legacy fallbacks during transition

## Contributing

When contributing to the unified preview system:

1. Follow the established patterns from `@quests/workspace`
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility
5. Add performance benchmarks for new features

## License

This unified preview system is part of the Applaa Builder project.