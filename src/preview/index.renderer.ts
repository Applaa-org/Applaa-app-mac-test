/**
 * 🚀 UNIFIED PREVIEW SYSTEM - RENDERER ENTRY POINT
 * 
 * Browser-compatible exports for renderer process
 */

// Core Components (Renderer versions)
export { UnifiedPreviewManagerRenderer as UnifiedPreviewManager } from './UnifiedPreviewManager.renderer';
export { createUnifiedPreviewManager } from './UnifiedPreviewManager.renderer';

// Browser-compatible MigrationAdapter
export { MigrationAdapterRenderer as MigrationAdapter, getMigrationAdapter, createMigrationAdapter } from './MigrationAdapter.renderer';

// Browser-compatible stubs for Node.js-only components
export const PreviewControlPlane = null;
export const SmartCacheManager = null;
export const ResourceManager = null;
export const PerformanceMonitor = null;
export const TemplateCacheManager = null;
export const AppLifecycleManager = null;

// Performance Dashboard (Renderer)
export { PerformanceDashboardRenderer } from './PerformanceDashboard.renderer';
export type { PerformanceMetrics, SystemAlert, PerformanceTrend } from './PerformanceDashboard';

// Types (avoid duplicate exports)
export type { AppType, AppState, AppPriority } from './types-simple';
export * from './types';

// Default Export
export { UnifiedPreviewManagerRenderer as default } from './UnifiedPreviewManager.renderer';