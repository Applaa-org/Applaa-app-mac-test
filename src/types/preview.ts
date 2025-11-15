// Common types for all preview systems

export interface PreviewStatus {
  isRunning: boolean;
  isLoading: boolean;
  error?: string;
  url?: string;
  lastUpdate: number;
}

export interface PreviewConfig {
  autoStart?: boolean;
  enableDevTools?: boolean;
  refreshInterval?: number;
  timeout?: number;
}

export interface PreviewMetrics {
  startTime: number;
  loadTime?: number;
  errorCount: number;
  requestCount: number;
  lastError?: string;
}

export type PreviewType = 'expo' | 'webapp' | 'flutter' | 'react-native' | 'nextjs' | 'vue' | 'svelte';

export interface PreviewSystem {
  type: PreviewType;
  name: string;
  description: string;
  supportedExtensions: string[];
  defaultPort: number;
  devToolsSupported: boolean;
}

// Preview system configurations
export const PREVIEW_SYSTEMS: Record<PreviewType, PreviewSystem> = {
  expo: {
    type: 'expo',
    name: 'Expo React Native',
    description: 'React Native apps with Expo SDK',
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    defaultPort: 8081,
    devToolsSupported: true
  },
  webapp: {
    type: 'webapp',
    name: 'Web Application',
    description: 'React, Next.js, Vue, Svelte web apps',
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
    defaultPort: 3000,
    devToolsSupported: true
  },
  flutter: {
    type: 'flutter',
    name: 'Flutter',
    description: 'Flutter mobile and web apps',
    supportedExtensions: ['.dart'],
    defaultPort: 8080,
    devToolsSupported: true
  },
  'react-native': {
    type: 'react-native',
    name: 'React Native CLI',
    description: 'React Native apps without Expo',
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    defaultPort: 8081,
    devToolsSupported: true
  },
  nextjs: {
    type: 'nextjs',
    name: 'Next.js',
    description: 'Next.js React applications',
    supportedExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    defaultPort: 3000,
    devToolsSupported: true
  },
  vue: {
    type: 'vue',
    name: 'Vue.js',
    description: 'Vue.js applications',
    supportedExtensions: ['.js', '.ts', '.vue'],
    defaultPort: 3000,
    devToolsSupported: true
  },
  svelte: {
    type: 'svelte',
    name: 'Svelte',
    description: 'Svelte applications',
    supportedExtensions: ['.js', '.ts', '.svelte'],
    defaultPort: 3000,
    devToolsSupported: true
  }
};

export function getPreviewSystem(type: PreviewType): PreviewSystem {
  return PREVIEW_SYSTEMS[type];
}

export function getSupportedExtensions(type: PreviewType): string[] {
  return PREVIEW_SYSTEMS[type]?.supportedExtensions || [];
}

export function getDefaultPort(type: PreviewType): number {
  return PREVIEW_SYSTEMS[type]?.defaultPort || 3000;
}

export function supportsDevTools(type: PreviewType): boolean {
  return PREVIEW_SYSTEMS[type]?.devToolsSupported || false;
}
