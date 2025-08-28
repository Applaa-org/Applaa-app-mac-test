/**
 * Mobile Components - Main Export Module
 * 
 * This module exports all mobile app creation components and utilities.
 */

// Main components
export { MobileFrameworkPicker } from './MobileFrameworkPicker';
export { MobileProjectCreationDialog, MobileProjectProgressIndicator } from './MobileProjectCreationDialog';
export { 
  MobileAppCreator, 
  QuickMobileCreator, 
  MobileAppCreatorCard,
  MobileFrameworkComparison 
} from './MobileAppCreator';
export { PromptEnrichmentViewer } from './PromptEnrichmentViewer';

// Re-export mobile hooks for convenience
export { useFlutterEnvironment, useFlutterSDK, useFlutterVersion } from '@/hooks/mobile/useFlutterEnvironment';
export { useMobileProjectCreation } from '@/hooks/mobile/useMobileProjectCreation';
export { useTemplateRegistry, useTemplateRecommendations } from '@/hooks/mobile/useTemplateRegistry';
export { usePromptEnrichment, useEnrichmentConfig } from '@/hooks/mobile/usePromptEnrichment';
