/**
 * 🎯 UNIFIED PREVIEW SYSTEM TYPES
 * 
 * Inspired by Quests App Builder architecture
 * Provides unified type definitions for all preview operations
 */

export type AppType = 'expo' | 'react' | 'vue' | 'flutter' | 'capacitor' | 'unknown' | 'nextjs' | 'angular' | 'python' | 'python-game' | 'python-web';

// App lifecycle management types
export type AppState = 'loading' | 'active' | 'suspended' | 'terminated' | 'error';

export type AppPriority = 'low' | 'normal' | 'high' | 'critical';

export type PreviewPhase = 
  | 'idle'
  | 'initializing'
  | 'preparing'
  | 'installing'
  | 'building'
  | 'warming'
  | 'ready'
  | 'error'
  | 'suspended';

export type PreviewConnectionType = 'qr' | 'tunnel' | 'lan' | 'web' | 'localhost' | 'expo' | 'local';

export interface PreviewConnection {
  type: PreviewConnectionType;
  url: string;
  qrCode?: string;
  isActive: boolean;
  priority?: number; // Higher = preferred
  label?: string; // Human-readable label for the connection
}

export interface PreviewMetrics {
  startTime: number;
  buildTime?: number;
  readyTime?: number;
  memoryUsage?: number;
  errorCount: number;
  lastError?: string;
  performanceScore?: number; // 0-100
  cacheHit?: boolean; // Whether template was loaded from cache
}

export interface PreviewResource {
  appId: number;
  port?: number;
  process?: any; // ChildProcess
  connections: PreviewConnection[];
  lastAccessed: number;
  isActive: boolean;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export interface PreviewState {
  appId: number;
  appType: AppType;
  phase: PreviewPhase;
  progress: number; // 0-100
  
  // User-facing messages
  userMessage: string;
  motivationalMessage?: string;
  
  // Technical details
  technicalDetails: string;
  
  // Status flags
  dependenciesReady: boolean;
  buildReady: boolean;
  serverReady: boolean;
  
  // Connections
  connections: PreviewConnection[];
  primaryConnection?: PreviewConnection;
  
  // Performance
  metrics: PreviewMetrics;
  
  // Estimated completion time
  estimatedTimeRemaining?: number;
  
  // Resource management
  resource?: PreviewResource;
  
  // Legacy compatibility properties
  status?: string;
  port?: number;
  url?: string;
  qrCode?: string;
  error?: string;
  logs?: string[];
}

export interface PreviewManagerConfig {
  maxConcurrentApps: number;
  resourcePoolSize: number;
  suspendInactiveAfter: number; // milliseconds
  cleanupInterval: number; // milliseconds
  performanceThreshold: number; // 0-100
  enableSmartCaching: boolean;
  enableOnDemandLoading: boolean;
}

export interface PreviewControlPlaneEvent {
  type: 'app-started' | 'app-stopped' | 'app-suspended' | 'app-resumed' | 'resource-allocated' | 'resource-freed';
  appId: number;
  timestamp: number;
  data?: any;
}

export interface PreviewControlPlaneState {
  activeApps: Map<number, PreviewState>;
  resourcePool: PreviewResource[];
  suspendedApps: Map<number, PreviewState>;
  eventHistory: PreviewControlPlaneEvent[];
  systemMetrics: {
    totalMemoryUsage: number;
    totalCpuUsage: number;
    activeAppCount: number;
    suspendedAppCount: number;
  };
}

// Event types for the unified system
export type PreviewEventType = 
  | 'preview:start'
  | 'preview:stop'
  | 'preview:suspend'
  | 'preview:resume'
  | 'preview:ready'
  | 'preview:error'
  | 'preview:progress'
  | 'resource:allocated'
  | 'resource:freed'
  | 'system:cleanup';

export interface PreviewEvent {
  type: PreviewEventType;
  appId: number;
  timestamp: number;
  data?: any;
}

// Callback types
export type PreviewEventCallback = (event: PreviewEvent) => void;
export type PreviewStateCallback = (appId: number, state: PreviewState) => void;
export type PreviewErrorCallback = (appId: number, error: Error) => void;

// API interfaces for IPC communication
export interface StartPreviewRequest {
  appId: number;
  appType?: AppType;
  options?: {
    useTunnel?: boolean;
    forceRestart?: boolean;
    skipCache?: boolean;
  };
}

export interface StartPreviewResponse {
  success: boolean;
  state?: PreviewState;
  error?: string;
}

export interface StopPreviewRequest {
  appId: number;
  options?: {
    suspend?: boolean; // If true, suspend instead of fully stopping
    cleanup?: boolean; // If true, cleanup all resources
  };
}

export interface StopPreviewResponse {
  success: boolean;
  error?: string;
}

export interface GetPreviewStateRequest {
  appId: number;
}

export interface GetPreviewStateResponse {
  success: boolean;
  state?: PreviewState;
  error?: string;
}

export interface ListActivePreviewsResponse {
  success: boolean;
  previews: PreviewState[];
  systemMetrics: PreviewControlPlaneState['systemMetrics'];
  error?: string;
}

// Configuration for different app types
export interface AppTypeConfig {
  type: AppType;
  defaultPort: number;
  startCommand: string;
  buildCommand?: string;
  healthCheckPath?: string;
  supportsTunnel: boolean;
  supportsQR: boolean;
  estimatedStartTime: number; // milliseconds
  requiredPorts: number;
  
  // Additional properties for compatibility
  estimatedMemory?: number;
  estimatedCpu?: number;
}

// Smart caching interfaces
export interface CacheEntry {
  key: string;
  appId: number;
  appType: AppType;
  timestamp: number;
  data: any;
  expiresAt?: number;
}

export interface SmartCacheConfig {
  maxEntries: number;
  defaultTTL: number; // milliseconds
  enableCompression: boolean;
  enablePersistence: boolean;
}

// Performance monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  appId?: number;
}

export interface PerformanceReport {
  appId: number;
  metrics: PerformanceMetric[];
  score: number; // 0-100
  recommendations: string[];
  timestamp: number;
}

// Resource management
export interface ResourceConstraints {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxConcurrentBuilds: number;
  maxPortRange: [number, number];
}

export interface ResourceAllocation {
  appId: number;
  allocatedAt: number;
  resources: {
    memory: number;
    cpu: number;
    port?: number;
  };
  constraints: ResourceConstraints;
}

// Error types
export class PreviewError extends Error {
  public appId: number;
  public phase: PreviewPhase;
  public code?: string;
  public recoverable: boolean;

  constructor(
    message: string,
    appId: number,
    phase: PreviewPhase,
    code?: string,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'PreviewError';
    this.appId = appId;
    this.phase = phase;
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class ResourceExhaustionError extends PreviewError {
  constructor(appId: number, resourceType: string) {
    super(
      `Resource exhaustion: ${resourceType}`,
      appId,
      'error',
      'RESOURCE_EXHAUSTION',
      false
    );
  }
}

export class PortAllocationError extends PreviewError {
  constructor(appId: number, portRange: [number, number]) {
    super(
      `Failed to allocate port in range ${portRange[0]}-${portRange[1]}`,
      appId,
      'error',
      'PORT_ALLOCATION_FAILED',
      true
    );
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PreviewStateUpdate = DeepPartial<PreviewState> & {
  appId: number;
};

// Constants
export const DEFAULT_PREVIEW_CONFIG: PreviewManagerConfig = {
  maxConcurrentApps: 10,
  resourcePoolSize: 5,
  suspendInactiveAfter: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  performanceThreshold: 70,
  enableSmartCaching: true,
  enableOnDemandLoading: true,
};

export const APP_TYPE_CONFIGS: Record<AppType, AppTypeConfig> = {
  expo: {
    type: 'expo',
    defaultPort: 8081,
    startCommand: 'npx expo start',
    healthCheckPath: '/',
    supportsTunnel: true,
    supportsQR: true,
    estimatedStartTime: 15000,
    requiredPorts: 3,
  },
  react: {
    type: 'react',
    defaultPort: 3000,
    startCommand: 'npm start',
    buildCommand: 'npm run build',
    healthCheckPath: '/',
    supportsTunnel: false,
    supportsQR: false,
    estimatedStartTime: 8000,
    requiredPorts: 1,
  },
  vue: {
    type: 'vue',
    defaultPort: 5173,
    startCommand: 'npm run dev',
    buildCommand: 'npm run build',
    healthCheckPath: '/',
    supportsTunnel: false,
    supportsQR: false,
    estimatedStartTime: 6000,
    requiredPorts: 1,
  },
  flutter: {
    type: 'flutter',
    defaultPort: 8080,
    startCommand: 'flutter run -d web-server --web-port',
    buildCommand: 'flutter build web',
    healthCheckPath: '/',
    supportsTunnel: false,
    supportsQR: false,
    estimatedStartTime: 20000,
    requiredPorts: 1,
  },
  capacitor: {
    type: 'capacitor',
    defaultPort: 8100,
    startCommand: 'ionic serve',
    buildCommand: 'ionic build',
    healthCheckPath: '/',
    supportsTunnel: false,
    supportsQR: false,
    estimatedStartTime: 10000,
    requiredPorts: 2,
  },
  nextjs: {
    type: 'nextjs',
    defaultPort: 3000,
    startCommand: 'npm run dev',
    buildCommand: 'npm run build',
    healthCheckPath: '/',
    supportsTunnel: false,
    supportsQR: false,
    estimatedStartTime: 8000,
    requiredPorts: 1,
  },
  unknown: {
    type: 'unknown',
    defaultPort: 3000,
    startCommand: 'npm start',
    buildCommand: 'npm run build',
    healthCheckPath: '/',
    supportsTunnel: true,
    supportsQR: false,
    estimatedStartTime: 30000,
    requiredPorts: 1,
  },
      angular: {
        type: 'angular',
        defaultPort: 4200,
        startCommand: 'ng serve',
        buildCommand: 'ng build',
        healthCheckPath: '/',
        supportsTunnel: true,
        supportsQR: false,
        estimatedStartTime: 45000,
        requiredPorts: 1,
      },
      python: {
        type: 'python',
        defaultPort: 8000,
        startCommand: 'python -m http.server',
        buildCommand: undefined,
        healthCheckPath: '/',
        supportsTunnel: false,
        supportsQR: false,
        estimatedStartTime: 2000,
        requiredPorts: 1,
      },
      'python-game': {
        type: 'python-game',
        defaultPort: 8001,
        startCommand: 'python main.py',
        buildCommand: undefined,
        healthCheckPath: '/',
        supportsTunnel: false,
        supportsQR: false,
        estimatedStartTime: 3000,
        requiredPorts: 1,
      },
      'python-web': {
        type: 'python-web',
        defaultPort: 5000,
        startCommand: 'python app.py',
        buildCommand: undefined,
        healthCheckPath: '/',
        supportsTunnel: true,
        supportsQR: false,
        estimatedStartTime: 5000,
        requiredPorts: 1,
      },
    };

export interface AppLifecycleConfig {
  appId: number;
  appType: AppType;
  priority: AppPriority;
  startTime: number;
  lastAccessed: number;
  state: AppState;
  suspendAfterMs?: number;
  maxIdleTime?: number;
  
  // Additional properties for compatibility
  suspensionTimeout?: number;
  enableStateRestoration?: boolean;
  enableAutoSuspension?: boolean;
  maxHistoryEntries?: number;
  cleanupInterval?: number;
  maxSuspendedApps?: number;
}

// Resource Management Types
export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface SystemResources {
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

export interface ResourceThresholds {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  diskWarning: number;
  diskCritical: number;
}