/**
 * 🚀 UNIFIED PREVIEW SYSTEM
 * 
 * Quest-inspired preview system for handling 100+ app templates
 * with improved performance, resource management, and scalability.
 */

// Core Components (Main process versions)
export { UnifiedPreviewManager } from './UnifiedPreviewManager';
export { PreviewControlPlane } from './PreviewControlPlane';
export { SmartCacheManager } from './SmartCacheManager';
export { ResourceManager } from './ResourceManager';
export { PerformanceMonitor } from './PerformanceMonitor';

// Migration & Compatibility
export { MigrationAdapter, getMigrationAdapter, LegacyPreviewAPI } from './MigrationAdapter';

// Types (avoid duplicate exports)
export type { AppType, AppState, AppPriority } from './types-simple';
export * from './types';

// Template Management
export { TemplateCacheManager } from './TemplateCacheManager';

// App Lifecycle
export { AppLifecycleManager } from './AppLifecycleManager';

// Performance Dashboard
export { PerformanceDashboard } from './PerformanceDashboard';
export type { PerformanceMetrics, SystemAlert, PerformanceTrend } from './PerformanceDashboard';

// Factory Functions
export { createUnifiedPreviewManager } from './UnifiedPreviewManager';

// Default Export
export { UnifiedPreviewManager as default } from './UnifiedPreviewManager';