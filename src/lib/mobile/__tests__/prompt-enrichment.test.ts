/**
 * Tests for prompt enrichment system
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  enrichPromptForMobileGeneration,
  generateSimplePrompt,
  analyzePromptEnrichment,
  DEFAULT_ENRICHMENT_CONFIG,
  type PromptEnrichmentConfig
} from '../prompt-enrichment';
import {
  validateGenerationSpec,
  optimizeGenerationSpec,
  mergeSpecWithTemplate,
  specToSummary,
  calculateSpecComplexity,
  createMinimalSpec,
  createComprehensiveSpec
} from '../generation-spec-utils';
import type { GenerationSpec, TemplateOption } from '../types';

// Mock template for testing
const mockFlutterTemplate: TemplateOption = {
  id: 'flutter-basic',
  title: 'Basic Flutter App',
  description: 'A simple Flutter application',
  framework: 'flutter',
  category: 'basic',
  tags: ['basic', 'simple'],
  platforms: ['android', 'ios'],
  dependencies: ['flutter'],
  complexity: 1,
  setupTime: 10,
  defaults: {
    stateMgmt: 'none',
    navigation: 'stack',
    backend: 'none',
    auth: 'none',
    features: []
  }
};

const mockExpoTemplate: TemplateOption = {
  id: 'expo-basic',
  title: 'Basic Expo App',
  description: 'A simple Expo application',
  framework: 'expo',
  category: 'basic',
  tags: ['basic', 'simple'],
  platforms: ['android', 'ios'],
  dependencies: ['expo'],
  complexity: 1,
  setupTime: 15,
  defaults: {
    stateMgmt: 'none',
    navigation: 'stack',
    backend: 'none',
    auth: 'none',
    features: []
  }
};

describe('Prompt Enrichment', () => {
  describe('enrichPromptForMobileGeneration', () => {
    test('should enrich a basic Flutter prompt', () => {
      const userPrompt = 'Create a todo app';
      const spec = createMinimalSpec('flutter');
      
      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate
      );

      expect(result.originalPrompt).toBe(userPrompt);
      expect(result.spec).toEqual(spec);
      expect(result.length).toBeGreaterThan(userPrompt.length);
      expect(result.prompt).toContain('Mobile App Generation Request');
      expect(result.prompt).toContain('Flutter Framework Requirements');
      expect(result.includedSections).toContain('Framework Guidance');
    });

    test('should enrich an Expo prompt differently than Flutter', () => {
      const userPrompt = 'Create a shopping app';
      const flutterSpec = createMinimalSpec('flutter');
      const expoSpec = createMinimalSpec('expo');

      const flutterResult = enrichPromptForMobileGeneration(
        userPrompt,
        flutterSpec,
        mockFlutterTemplate
      );

      const expoResult = enrichPromptForMobileGeneration(
        userPrompt,
        expoSpec,
        mockExpoTemplate
      );

      expect(flutterResult.prompt).toContain('Flutter Framework Requirements');
      expect(flutterResult.prompt).toContain('widget-based architecture');
      
      expect(expoResult.prompt).toContain('Expo Framework Requirements');
      expect(expoResult.prompt).toContain('React Native components');
      
      expect(flutterResult.prompt).not.toEqual(expoResult.prompt);
    });

    test('should include platform-specific guidance', () => {
      const userPrompt = 'Create a multi-platform app';
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        platforms: ['android', 'ios', 'web', 'desktop']
      };

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate
      );

      expect(result.prompt).toContain('iOS Considerations');
      expect(result.prompt).toContain('Android Considerations');
      expect(result.prompt).toContain('Web Considerations');
      expect(result.prompt).toContain('Desktop Considerations');
      expect(result.includedSections).toContain('Platform Guidance');
    });

    test('should include architecture guidance for complex specs', () => {
      const userPrompt = 'Create a complex social media app';
      const spec = createComprehensiveSpec('flutter');

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate
      );

      expect(result.prompt).toContain('Architecture Configuration');
      expect(result.prompt).toContain('State Management: riverpod');
      expect(result.prompt).toContain('Backend Integration: firebase');
      expect(result.includedSections).toContain('Architecture Guidance');
    });

    test('should include dependency recommendations', () => {
      const userPrompt = 'Create an app with authentication';
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        backend: 'firebase',
        auth: 'oauth',
        stateMgmt: 'provider'
      };

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate
      );

      expect(result.prompt).toContain('Recommended Dependencies');
      expect(result.prompt).toContain('provider');
      expect(result.prompt).toContain('firebase_core');
      expect(result.includedSections).toContain('Dependency Guidance');
    });

    test('should respect enrichment configuration', () => {
      const userPrompt = 'Create a simple app';
      const spec = createMinimalSpec('flutter');
      
      const minimalConfig: Partial<PromptEnrichmentConfig> = {
        includePlatformGuidance: false,
        includeFrameworkBestPractices: true,
        includeTemplatePatterns: false,
        includeDependencyGuidance: false,
        includeArchitectureGuidance: false
      };

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate,
        minimalConfig
      );

      expect(result.includedSections).toContain('Framework Guidance');
      expect(result.includedSections).not.toContain('Platform Guidance');
      expect(result.includedSections).not.toContain('Template Patterns');
      expect(result.includedSections).not.toContain('Dependency Guidance');
      expect(result.includedSections).not.toContain('Architecture Guidance');
    });

    test('should truncate prompt when exceeding max length', () => {
      const userPrompt = 'Create a comprehensive app';
      const spec = createComprehensiveSpec('flutter');
      
      const shortConfig: Partial<PromptEnrichmentConfig> = {
        maxPromptLength: 500
      };

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate,
        shortConfig
      );

      expect(result.wasTruncated).toBe(true);
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result.prompt).toContain('Prompt was truncated');
    });

    test('should handle template-specific patterns', () => {
      const userPrompt = 'Create a navigation-heavy app';
      const navigationTemplate: TemplateOption = {
        ...mockFlutterTemplate,
        id: 'flutter-navigation',
        category: 'navigation',
        title: 'Navigation Template'
      };

      const result = enrichPromptForMobileGeneration(
        userPrompt,
        createMinimalSpec('flutter'),
        navigationTemplate
      );

      expect(result.prompt).toContain('Template: Navigation Template');
      expect(result.prompt).toContain('navigation structure');
      expect(result.includedSections).toContain('Template Patterns');
    });
  });

  describe('generateSimplePrompt', () => {
    test('should generate a basic prompt without enrichment', () => {
      const userPrompt = 'Create a weather app';
      const spec = createMinimalSpec('flutter');

      const result = generateSimplePrompt(userPrompt, spec);

      expect(result).toContain('Create a flutter mobile app: Create a weather app');
      expect(result).toContain('Framework: flutter');
      expect(result).toContain('Platforms: android, ios');
      expect(result).toContain('Template: flutter-minimal');
      expect(result.length).toBeLessThan(200);
    });
  });

  describe('analyzePromptEnrichment', () => {
    test('should analyze enrichment effectiveness', () => {
      const userPrompt = 'Create a simple app';
      const spec = createMinimalSpec('flutter');
      
      const enriched = enrichPromptForMobileGeneration(
        userPrompt,
        spec,
        mockFlutterTemplate
      );

      const analysis = analyzePromptEnrichment(enriched);

      expect(analysis.enrichmentRatio).toBeGreaterThan(1);
      expect(analysis.structuredDataRatio).toBeGreaterThan(0);
      expect(analysis.guidanceRatio).toBeGreaterThan(0);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    test('should provide recommendations for low enrichment', () => {
      const mockEnriched = {
        originalPrompt: 'Create app',
        prompt: 'Create app with minimal guidance',
        spec: createMinimalSpec('flutter'),
        includedSections: ['Framework Guidance'],
        wasTruncated: false,
        length: 50
      };

      const analysis = analyzePromptEnrichment(mockEnriched);

      expect(analysis.enrichmentRatio).toBeLessThan(2);
      expect(analysis.recommendations).toContain(
        'Consider adding more structured guidance for better code generation'
      );
    });
  });
});

describe('Generation Spec Utils', () => {
  describe('validateGenerationSpec', () => {
    test('should validate a correct spec', () => {
      const spec = createMinimalSpec('flutter');
      const result = validateGenerationSpec(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should catch missing required fields', () => {
      const invalidSpec = {
        // Missing framework
        templateId: 'test',
        platforms: ['android'],
        stateMgmt: 'none',
        navigation: 'stack',
        backend: 'none',
        auth: 'none',
        features: []
      } as GenerationSpec;

      const result = validateGenerationSpec(invalidSpec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Framework is required');
    });

    test('should validate platform compatibility', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('expo'),
        platforms: ['desktop'] // Desktop not natively supported by Expo
      };

      const result = validateGenerationSpec(spec);

      expect(result.warnings).toContain('Desktop platform is not natively supported by Expo');
    });

    test('should validate state management compatibility', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('expo'),
        stateMgmt: 'bloc' // BLoC is Flutter-specific
      };

      const result = validateGenerationSpec(spec);

      expect(result.warnings).toContain('bloc is Flutter-specific; consider Redux or Context API for Expo');
    });

    test('should suggest backend for auth', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        auth: 'email',
        backend: 'none'
      };

      const result = validateGenerationSpec(spec);

      expect(result.warnings).toContain('Authentication requires a backend service');
      expect(result.suggestions).toContain('Consider adding Firebase or REST API backend for authentication');
    });
  });

  describe('optimizeGenerationSpec', () => {
    test('should optimize multi-platform apps', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        platforms: ['android', 'ios', 'web'],
        stateMgmt: 'none'
      };

      const result = optimizeGenerationSpec(spec);

      expect(result.optimizedSpec.stateMgmt).toBe('provider');
      expect(result.changes).toContain('Added Provider state management for multi-platform app');
      expect(result.improvements).toContain('Better state management for complex app');
    });

    test('should add responsive feature for multi-platform apps', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        platforms: ['android', 'ios'],
        features: []
      };

      const result = optimizeGenerationSpec(spec);

      expect(result.optimizedSpec.features).toContain('responsive');
      expect(result.changes).toContain('Added responsive design feature for multi-platform app');
    });

    test('should optimize auth and backend combination', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        auth: 'email',
        backend: 'none'
      };

      const result = optimizeGenerationSpec(spec);

      expect(result.optimizedSpec.backend).toBe('firebase');
      expect(result.changes).toContain('Added Firebase backend for authentication');
    });

    test('should remove duplicates', () => {
      const spec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        platforms: ['android', 'ios', 'android', 'ios'],
        features: ['responsive', 'dark-mode', 'responsive']
      };

      const result = optimizeGenerationSpec(spec);

      expect(result.optimizedSpec.platforms).toEqual(['android', 'ios']);
      expect(result.optimizedSpec.features).toEqual(['responsive', 'dark-mode']);
      expect(result.changes).toContain('Removed duplicate platforms');
      expect(result.changes).toContain('Removed duplicate features');
    });
  });

  describe('mergeSpecWithTemplate', () => {
    test('should merge user spec with template defaults', () => {
      const userSpec = {
        platforms: ['android', 'ios', 'web'],
        stateMgmt: 'provider' as const
      };

      const result = mergeSpecWithTemplate(userSpec, mockFlutterTemplate);

      expect(result.framework).toBe('flutter');
      expect(result.templateId).toBe('flutter-basic');
      expect(result.platforms).toEqual(['android', 'ios', 'web']);
      expect(result.stateMgmt).toBe('provider');
      expect(result.navigation).toBe('stack'); // From template defaults
    });

    test('should preserve template framework', () => {
      const userSpec = {
        framework: 'expo' as const // Should be overridden by template
      };

      const result = mergeSpecWithTemplate(userSpec, mockFlutterTemplate);

      expect(result.framework).toBe('flutter'); // Template takes precedence
    });

    test('should allow custom templateId', () => {
      const userSpec = {
        templateId: 'custom-template'
      };

      const result = mergeSpecWithTemplate(userSpec, mockFlutterTemplate);

      expect(result.templateId).toBe('custom-template');
    });
  });

  describe('specToSummary', () => {
    test('should create readable summary', () => {
      const spec = createComprehensiveSpec('flutter');
      const summary = specToSummary(spec);

      expect(summary).toContain('📱 Flutter App');
      expect(summary).toContain('🎯 Platforms: android, ios, web');
      expect(summary).toContain('🏗️ State: riverpod');
      expect(summary).toContain('🔗 Backend: firebase');
      expect(summary).toContain('🔐 Auth: oauth');
      expect(summary).toContain('✨ Features:');
    });

    test('should handle minimal spec', () => {
      const spec = createMinimalSpec('flutter');
      const summary = specToSummary(spec);

      expect(summary).toContain('📱 Flutter App');
      expect(summary).toContain('🎯 Platforms: android, ios');
      expect(summary).not.toContain('🏗️ State:');
      expect(summary).not.toContain('🔗 Backend:');
    });
  });

  describe('calculateSpecComplexity', () => {
    test('should calculate simple complexity', () => {
      const spec = createMinimalSpec('flutter');
      const result = calculateSpecComplexity(spec);

      expect(result.level).toBe('Simple');
      expect(result.score).toBeLessThan(3);
      expect(result.factors).toHaveLength(0);
    });

    test('should calculate complex complexity', () => {
      const spec = createComprehensiveSpec('flutter');
      const result = calculateSpecComplexity(spec);

      expect(result.level).toBeOneOf(['Complex', 'Advanced']);
      expect(result.score).toBeGreaterThan(4);
      expect(result.factors.length).toBeGreaterThan(3);
      expect(result.factors).toContain('Multi-platform (3 platforms)');
      expect(result.factors).toContain('State management: riverpod');
    });

    test('should account for different factors', () => {
      const complexSpec: GenerationSpec = {
        ...createMinimalSpec('flutter'),
        platforms: ['android', 'ios', 'web', 'desktop'],
        stateMgmt: 'bloc',
        backend: 'graphql',
        auth: 'biometric',
        features: ['responsive', 'dark-mode', 'offline', 'push-notifications', 'analytics']
      };

      const result = calculateSpecComplexity(complexSpec);

      expect(result.level).toBe('Advanced');
      expect(result.score).toBeGreaterThan(7);
      expect(result.factors).toContain('Multi-platform (4 platforms)');
      expect(result.factors).toContain('Multiple features (5)');
    });
  });

  describe('createMinimalSpec and createComprehensiveSpec', () => {
    test('should create valid minimal specs', () => {
      const flutterSpec = createMinimalSpec('flutter');
      const expoSpec = createMinimalSpec('expo');

      expect(validateGenerationSpec(flutterSpec).valid).toBe(true);
      expect(validateGenerationSpec(expoSpec).valid).toBe(true);
      
      expect(flutterSpec.framework).toBe('flutter');
      expect(expoSpec.framework).toBe('expo');
      
      expect(flutterSpec.stateMgmt).toBe('none');
      expect(flutterSpec.backend).toBe('none');
    });

    test('should create valid comprehensive specs', () => {
      const flutterSpec = createComprehensiveSpec('flutter');
      const expoSpec = createComprehensiveSpec('expo');

      expect(validateGenerationSpec(flutterSpec).valid).toBe(true);
      expect(validateGenerationSpec(expoSpec).valid).toBe(true);
      
      expect(flutterSpec.stateMgmt).toBe('riverpod');
      expect(expoSpec.stateMgmt).toBe('redux');
      
      expect(flutterSpec.backend).toBe('firebase');
      expect(flutterSpec.auth).toBe('oauth');
      expect(flutterSpec.features.length).toBeGreaterThan(3);
    });
  });
});


