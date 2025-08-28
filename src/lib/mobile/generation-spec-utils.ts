/**
 * GenerationSpec Utilities
 * 
 * Utilities for working with GenerationSpec objects, including validation,
 * merging, optimization, and conversion functions.
 */

import type { 
  GenerationSpec, 
  TemplateOption, 
  Framework,
  Platform,
  StateMgmt,
  NavigationType,
  BackendType,
  AuthType,
  FeatureType
} from './types';

/**
 * Validation result for GenerationSpec
 */
export interface SpecValidationResult {
  /** Whether the spec is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Suggested fixes */
  suggestions: string[];
}

/**
 * Spec optimization result
 */
export interface SpecOptimizationResult {
  /** Optimized spec */
  optimizedSpec: GenerationSpec;
  
  /** Changes made during optimization */
  changes: string[];
  
  /** Performance improvements */
  improvements: string[];
}

/**
 * Comprehensive GenerationSpec validation
 */
export function validateGenerationSpec(spec: GenerationSpec): SpecValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate framework
  if (!spec.framework) {
    errors.push('Framework is required');
  } else if (!['flutter', 'expo'].includes(spec.framework)) {
    errors.push(`Invalid framework: ${spec.framework}`);
  }

  // Validate template ID
  if (!spec.templateId) {
    errors.push('Template ID is required');
  } else if (typeof spec.templateId !== 'string' || spec.templateId.trim() === '') {
    errors.push('Template ID must be a non-empty string');
  }

  // Validate platforms
  if (!spec.platforms || spec.platforms.length === 0) {
    errors.push('At least one platform must be specified');
  } else {
    const validPlatforms: Platform[] = ['android', 'ios', 'web', 'desktop'];
    const invalidPlatforms = spec.platforms.filter(p => !validPlatforms.includes(p));
    
    if (invalidPlatforms.length > 0) {
      errors.push(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
    }

    // Platform-specific warnings
    if (spec.platforms.includes('ios') && spec.framework === 'expo') {
      warnings.push('iOS platform with Expo requires proper Apple Developer account for production');
    }

    if (spec.platforms.includes('desktop') && spec.framework === 'expo') {
      warnings.push('Desktop platform is not natively supported by Expo');
    }
  }

  // Validate state management
  const validStateMgmt: StateMgmt[] = ['none', 'provider', 'riverpod', 'bloc', 'redux'];
  if (!validStateMgmt.includes(spec.stateMgmt)) {
    errors.push(`Invalid state management: ${spec.stateMgmt}`);
  }

  // Framework-specific state management validation
  if (spec.framework === 'flutter' && spec.stateMgmt === 'redux') {
    warnings.push('Redux is uncommon in Flutter; consider Provider, Riverpod, or BLoC');
    suggestions.push('Use Riverpod or BLoC for complex state management in Flutter');
  }

  if (spec.framework === 'expo' && ['provider', 'riverpod', 'bloc'].includes(spec.stateMgmt)) {
    warnings.push(`${spec.stateMgmt} is Flutter-specific; consider Redux or Context API for Expo`);
  }

  // Validate navigation
  const validNavigation: NavigationType[] = ['stack', 'tab', 'drawer', 'bottom-tab'];
  if (!validNavigation.includes(spec.navigation)) {
    errors.push(`Invalid navigation type: ${spec.navigation}`);
  }

  // Validate backend
  const validBackend: BackendType[] = ['none', 'rest', 'graphql', 'firebase', 'supabase'];
  if (!validBackend.includes(spec.backend)) {
    errors.push(`Invalid backend type: ${spec.backend}`);
  }

  // Validate auth
  const validAuth: AuthType[] = ['none', 'email', 'oauth', 'phone', 'biometric'];
  if (!validAuth.includes(spec.auth)) {
    errors.push(`Invalid auth type: ${spec.auth}`);
  }

  // Auth and backend compatibility
  if (spec.auth !== 'none' && spec.backend === 'none') {
    warnings.push('Authentication requires a backend service');
    suggestions.push('Consider adding Firebase or REST API backend for authentication');
  }

  // Validate features
  if (spec.features) {
    const validFeatures: FeatureType[] = [
      'responsive', 'dark-mode', 'offline', 'push-notifications', 
      'analytics', 'crash-reporting', 'image-caching', 'lazy-loading'
    ];
    
    const invalidFeatures = spec.features.filter(f => !validFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      errors.push(`Invalid features: ${invalidFeatures.join(', ')}`);
    }

    // Feature compatibility warnings
    if (spec.features.includes('push-notifications') && spec.backend === 'none') {
      warnings.push('Push notifications typically require a backend service');
    }

    if (spec.features.includes('offline') && spec.backend === 'graphql') {
      warnings.push('Offline support with GraphQL requires additional consideration for caching');
    }
  }

  // Validate custom packages
  if (spec.customPackages) {
    for (const pkg of spec.customPackages) {
      if (!pkg.name || !pkg.version) {
        errors.push(`Invalid custom package: missing name or version`);
      }
      
      if (pkg.name.includes('/') && spec.framework === 'flutter') {
        warnings.push(`Package ${pkg.name} appears to be npm-style but this is a Flutter project`);
      }
    }
  }

  // Cross-validation suggestions
  if (spec.platforms.length > 2 && spec.stateMgmt === 'none') {
    suggestions.push('Consider using state management for multi-platform apps');
  }

  if (spec.backend !== 'none' && !spec.features.includes('offline')) {
    suggestions.push('Consider adding offline support for apps with backend integration');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Merge GenerationSpec with template defaults intelligently
 */
export function mergeSpecWithTemplate(
  userSpec: Partial<GenerationSpec>,
  template: TemplateOption
): GenerationSpec {
  // Start with base defaults
  const baseDefaults: GenerationSpec = {
    framework: template.framework,
    templateId: template.id,
    stateMgmt: 'none',
    navigation: 'stack',
    backend: 'none',
    auth: 'none',
    features: [],
    platforms: template.platforms.slice(0, 2), // Default to first 2 platforms
    customPackages: []
  };

  // Apply template defaults
  const withTemplateDefaults = {
    ...baseDefaults,
    ...template.defaults
  };

  // Apply user overrides, but preserve template framework and use user templateId if provided
  const merged = {
    ...withTemplateDefaults,
    ...userSpec,
    framework: template.framework, // Template framework always takes precedence
    templateId: userSpec.templateId || template.id // User can override templateId
  };

  return merged;
}

/**
 * Optimize GenerationSpec for better performance and compatibility
 */
export function optimizeGenerationSpec(spec: GenerationSpec): SpecOptimizationResult {
  const optimized = { ...spec };
  const changes: string[] = [];
  const improvements: string[] = [];

  // Remove duplicate platforms
  const uniquePlatforms = [...new Set(spec.platforms)];
  if (uniquePlatforms.length !== spec.platforms.length) {
    optimized.platforms = uniquePlatforms;
    changes.push('Removed duplicate platforms');
    improvements.push('Reduced platform complexity');
  }

  // Remove duplicate features
  if (spec.features) {
    const uniqueFeatures = [...new Set(spec.features)];
    if (uniqueFeatures.length !== spec.features.length) {
      optimized.features = uniqueFeatures;
      changes.push('Removed duplicate features');
    }
  }

  // Optimize state management for platform count
  if (spec.platforms.length >= 3 && spec.stateMgmt === 'none') {
    if (spec.framework === 'flutter') {
      optimized.stateMgmt = 'provider';
      changes.push('Added Provider state management for multi-platform app');
      improvements.push('Better state management for complex app');
    } else if (spec.framework === 'expo') {
      optimized.stateMgmt = 'redux';
      changes.push('Added Redux state management for multi-platform app');
      improvements.push('Better state management for complex app');
    }
  }

  // Add responsive feature for multi-platform apps
  if (spec.platforms.length >= 2 && !spec.features.includes('responsive')) {
    optimized.features = [...(spec.features || []), 'responsive'];
    changes.push('Added responsive design feature for multi-platform app');
    improvements.push('Better UI adaptation across platforms');
  }

  // Optimize backend and auth combination
  if (spec.auth !== 'none' && spec.backend === 'none') {
    optimized.backend = 'firebase';
    changes.push('Added Firebase backend for authentication');
    improvements.push('Simplified authentication setup');
  }

  // Add recommended features based on backend
  if (spec.backend !== 'none') {
    const recommendedFeatures: FeatureType[] = [];
    
    if (!spec.features.includes('offline')) {
      recommendedFeatures.push('offline');
    }
    
    if (!spec.features.includes('analytics')) {
      recommendedFeatures.push('analytics');
    }
    
    if (recommendedFeatures.length > 0) {
      optimized.features = [...(spec.features || []), ...recommendedFeatures];
      changes.push(`Added recommended features for backend integration: ${recommendedFeatures.join(', ')}`);
      improvements.push('Enhanced app capabilities with backend features');
    }
  }

  // Sort platforms by development priority (mobile first)
  const platformPriority: Record<Platform, number> = {
    'android': 1,
    'ios': 2,
    'web': 3,
    'desktop': 4
  };

  optimized.platforms = optimized.platforms.sort((a, b) => 
    platformPriority[a] - platformPriority[b]
  );

  if (JSON.stringify(spec.platforms) !== JSON.stringify(optimized.platforms)) {
    changes.push('Optimized platform order for development priority');
    improvements.push('Better development workflow with mobile-first approach');
  }

  return {
    optimizedSpec: optimized,
    changes,
    improvements
  };
}

/**
 * Convert GenerationSpec to a human-readable summary
 */
export function specToSummary(spec: GenerationSpec): string {
  const parts: string[] = [];

  parts.push(`📱 ${spec.framework.charAt(0).toUpperCase() + spec.framework.slice(1)} App`);
  parts.push(`🎯 Platforms: ${spec.platforms.join(', ')}`);
  
  if (spec.stateMgmt !== 'none') {
    parts.push(`🏗️ State: ${spec.stateMgmt}`);
  }
  
  if (spec.navigation !== 'stack') {
    parts.push(`🧭 Navigation: ${spec.navigation}`);
  }
  
  if (spec.backend !== 'none') {
    parts.push(`🔗 Backend: ${spec.backend}`);
  }
  
  if (spec.auth !== 'none') {
    parts.push(`🔐 Auth: ${spec.auth}`);
  }
  
  if (spec.features && spec.features.length > 0) {
    parts.push(`✨ Features: ${spec.features.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Compare two GenerationSpecs and highlight differences
 */
export function compareSpecs(spec1: GenerationSpec, spec2: GenerationSpec): {
  identical: boolean;
  differences: string[];
  additions: string[];
  removals: string[];
} {
  const differences: string[] = [];
  const additions: string[] = [];
  const removals: string[] = [];

  // Compare simple properties
  const simpleProps: (keyof GenerationSpec)[] = ['framework', 'templateId', 'stateMgmt', 'navigation', 'backend', 'auth'];
  
  for (const prop of simpleProps) {
    if (spec1[prop] !== spec2[prop]) {
      differences.push(`${prop}: ${spec1[prop]} → ${spec2[prop]}`);
    }
  }

  // Compare platforms
  const platforms1 = new Set(spec1.platforms);
  const platforms2 = new Set(spec2.platforms);
  
  for (const platform of platforms2) {
    if (!platforms1.has(platform)) {
      additions.push(`Platform: ${platform}`);
    }
  }
  
  for (const platform of platforms1) {
    if (!platforms2.has(platform)) {
      removals.push(`Platform: ${platform}`);
    }
  }

  // Compare features
  const features1 = new Set(spec1.features || []);
  const features2 = new Set(spec2.features || []);
  
  for (const feature of features2) {
    if (!features1.has(feature)) {
      additions.push(`Feature: ${feature}`);
    }
  }
  
  for (const feature of features1) {
    if (!features2.has(feature)) {
      removals.push(`Feature: ${feature}`);
    }
  }

  const identical = differences.length === 0 && additions.length === 0 && removals.length === 0;

  return {
    identical,
    differences,
    additions,
    removals
  };
}

/**
 * Create a minimal GenerationSpec for testing
 */
export function createMinimalSpec(framework: Framework): GenerationSpec {
  return {
    framework,
    templateId: `${framework}-minimal`,
    stateMgmt: 'none',
    navigation: 'stack',
    backend: 'none',
    auth: 'none',
    features: [],
    platforms: framework === 'flutter' ? ['android', 'ios'] : ['android', 'ios'],
    customPackages: []
  };
}

/**
 * Create a comprehensive GenerationSpec for complex apps
 */
export function createComprehensiveSpec(framework: Framework): GenerationSpec {
  return {
    framework,
    templateId: `${framework}-comprehensive`,
    stateMgmt: framework === 'flutter' ? 'riverpod' : 'redux',
    navigation: 'tab',
    backend: 'firebase',
    auth: 'oauth',
    features: ['responsive', 'dark-mode', 'offline', 'push-notifications', 'analytics'],
    platforms: ['android', 'ios', 'web'],
    customPackages: []
  };
}

/**
 * Extract spec from existing project configuration
 */
export function extractSpecFromProject(projectPath: string): Promise<Partial<GenerationSpec>> {
  // This would analyze the project structure and extract the GenerationSpec
  // For now, return a basic implementation
  return Promise.resolve({
    // Would be implemented based on actual project analysis
  });
}

/**
 * Calculate complexity score for a GenerationSpec
 */
export function calculateSpecComplexity(spec: GenerationSpec): {
  score: number;
  level: 'Simple' | 'Moderate' | 'Complex' | 'Advanced';
  factors: string[];
} {
  let score = 1; // Base score
  const factors: string[] = [];

  // Platform complexity
  score += spec.platforms.length * 0.5;
  if (spec.platforms.length > 2) {
    factors.push(`Multi-platform (${spec.platforms.length} platforms)`);
  }

  // State management complexity
  if (spec.stateMgmt !== 'none') {
    score += spec.stateMgmt === 'bloc' ? 2 : 1;
    factors.push(`State management: ${spec.stateMgmt}`);
  }

  // Backend complexity
  if (spec.backend !== 'none') {
    score += spec.backend === 'graphql' ? 2 : 1;
    factors.push(`Backend: ${spec.backend}`);
  }

  // Authentication complexity
  if (spec.auth !== 'none') {
    score += spec.auth === 'biometric' ? 2 : 1;
    factors.push(`Authentication: ${spec.auth}`);
  }

  // Features complexity
  score += (spec.features?.length || 0) * 0.3;
  if ((spec.features?.length || 0) > 3) {
    factors.push(`Multiple features (${spec.features?.length})`);
  }

  // Custom packages complexity
  score += (spec.customPackages?.length || 0) * 0.2;

  // Determine level
  let level: 'Simple' | 'Moderate' | 'Complex' | 'Advanced';
  if (score <= 2) level = 'Simple';
  else if (score <= 4) level = 'Moderate';
  else if (score <= 7) level = 'Complex';
  else level = 'Advanced';

  return {
    score: Math.round(score * 10) / 10,
    level,
    factors
  };
}


