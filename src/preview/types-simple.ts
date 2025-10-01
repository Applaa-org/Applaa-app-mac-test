/**
 * Simple types file to isolate export issues
 * Contains only the basic types needed for the preview system
 */

// App lifecycle states
export type AppState = 'loading' | 'active' | 'suspended' | 'terminated' | 'error';

// App priority levels for resource management
export type AppPriority = 'low' | 'normal' | 'high' | 'critical';

// Supported application types
export type AppType = 'expo' | 'react' | 'vue' | 'flutter' | 'capacitor' | 'unknown' | 'nextjs' | 'angular' | 'python' | 'python-game' | 'python-web';