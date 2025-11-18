import React from 'react';
import { PreviewType, getPreviewSystem } from '@/types/preview';
import { WebappPreview } from '@/components/webapp/WebappPreview';
import { SnackPoweredPreview } from '@/components/expo/SnackPoweredPreview';

interface PreviewFactoryProps {
  appId: number;
  previewType: PreviewType;
  className?: string;
  [key: string]: any; // Allow additional props to be passed through
}

/**
 * Factory component that creates the appropriate preview component
 * based on the preview type. This allows for easy extensibility
 * when adding new preview types.
 */
export function PreviewFactory({ 
  appId, 
  previewType, 
  className = '',
  ...props 
}: PreviewFactoryProps) {
  const previewSystem = getPreviewSystem(previewType);

  // Route to appropriate preview component based on type
  switch (previewType) {
    case 'expo':
      return (
        <SnackPoweredPreview 
          className={className}
          {...props}
        />
      );

    case 'webapp':
    case 'nextjs':
    case 'vue':
    case 'svelte':
      return (
        <WebappPreview 
          appId={appId}
          previewType={previewType}
          className={className}
          {...props}
        />
      );

    case 'flutter':
    case 'react-native':
      // TODO: Implement Flutter and React Native CLI previews
      return (
        <div className={`flex items-center justify-center h-full ${className}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🚧</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {previewSystem.name} Preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Coming soon! {previewSystem.description}
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className={`flex items-center justify-center h-full ${className}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Unsupported Preview Type
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Preview type "{previewType}" is not supported yet.
            </p>
          </div>
        </div>
      );
  }
}

/**
 * Hook to get preview system configuration
 */
export function usePreviewSystem(previewType: PreviewType) {
  return getPreviewSystem(previewType);
}

/**
 * Utility to check if a preview type supports DevTools
 */
export function previewSupportsDevTools(previewType: PreviewType): boolean {
  const system = getPreviewSystem(previewType);
  return system.devToolsSupported;
}
