/**
 * Simple types file to isolate export issues (JavaScript version)
 * Contains only the basic types needed for the preview system
 */

// App lifecycle states
export const AppState = {
  LOADING: 'loading',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  ERROR: 'error'
};

// App priority levels for resource management
export const AppPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Supported application types
export const AppType = {
  EXPO: 'expo',
  REACT: 'react',
  VUE: 'vue',
  FLUTTER: 'flutter',
  CAPACITOR: 'capacitor',
  UNKNOWN: 'unknown',
  NEXTJS: 'nextjs',
  ANGULAR: 'angular'
};