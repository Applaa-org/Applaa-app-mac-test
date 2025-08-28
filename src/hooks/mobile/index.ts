/**
 * Mobile App Hooks - Main Export Module
 * 
 * This module exports all React hooks for mobile app functionality.
 */

// Export all template registry hooks
export {
  useTemplateRegistry,
  useFrameworkTemplates,
  useCategoryTemplates,
  usePlatformTemplates,
  useBeginnerTemplates,
  useAdvancedTemplates,
  useTemplateSearch,
  useTemplateRecommendations,
  useTemplateComparison
} from './useTemplateRegistry';

// Export Flutter environment hooks
export {
  useFlutterEnvironment,
  useFlutterSDK,
  useFlutterVersion,
  useFlutterInstallation,
  useFlutterProjectCreation,
  useFlutterProjectValidation,
  useFlutterPath,
  useFlutterHealthCheck
} from './useFlutterEnvironment';

// Export mobile project creation hooks
export {
  useMobileProjectCreation,
  useMobileProjectCreationWithValidation,
  useMobileProjectAnalytics
} from './useMobileProjectCreation';
