/**
 * Mobile App Templates - Main Export Module
 * 
 * This module exports all template data and utility functions.
 */

// Export all template collections
export {
  FLUTTER_TEMPLATES,
  EXPO_TEMPLATES,
  ALL_TEMPLATES
} from './templates';

// Export all utility functions
export {
  getTemplateById,
  getTemplatesByFramework,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  searchTemplates,
  getTemplatesByComplexity,
  getFeaturedTemplates,
  getBeginnerTemplates,
  getTemplatesForUseCase,
  validateTemplateRegistry,
  getTemplateStats
} from './templates';


