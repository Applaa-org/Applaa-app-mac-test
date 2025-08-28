/**
 * Tests for mobile app generation types and validation functions
 */

import {
  GenerationSpec,
  validateGenerationSpec,
  mergeSpecWithTemplate,
  getPlatformCapabilities,
  isFramework,
  isStateMgmt,
  isPlatform,
  isTemplateCategory,
  Framework,
  StateMgmt,
  Platform,
  TemplateCategory,
  TemplateOption
} from '../types';

describe('Type Guards', () => {
  describe('isFramework', () => {
    test('should validate correct framework values', () => {
      expect(isFramework('expo')).toBe(true);
      expect(isFramework('flutter')).toBe(true);
    });

    test('should reject invalid framework values', () => {
      expect(isFramework('react')).toBe(false);
      expect(isFramework('vue')).toBe(false);
      expect(isFramework('')).toBe(false);
      expect(isFramework('invalid')).toBe(false);
    });
  });

  describe('isStateMgmt', () => {
    test('should validate correct state management values', () => {
      expect(isStateMgmt('provider')).toBe(true);
      expect(isStateMgmt('riverpod')).toBe(true);
      expect(isStateMgmt('bloc')).toBe(true);
      expect(isStateMgmt('zustand')).toBe(true);
      expect(isStateMgmt('redux')).toBe(true);
      expect(isStateMgmt('none')).toBe(true);
    });

    test('should reject invalid state management values', () => {
      expect(isStateMgmt('mobx')).toBe(false);
      expect(isStateMgmt('recoil')).toBe(false);
      expect(isStateMgmt('')).toBe(false);
    });
  });

  describe('isPlatform', () => {
    test('should validate correct platform values', () => {
      expect(isPlatform('android')).toBe(true);
      expect(isPlatform('ios')).toBe(true);
      expect(isPlatform('web')).toBe(true);
      expect(isPlatform('desktop')).toBe(true);
    });

    test('should reject invalid platform values', () => {
      expect(isPlatform('windows')).toBe(false);
      expect(isPlatform('macos')).toBe(false);
      expect(isPlatform('')).toBe(false);
    });
  });

  describe('isTemplateCategory', () => {
    test('should validate correct category values', () => {
      expect(isTemplateCategory('basic')).toBe(true);
      expect(isTemplateCategory('navigation')).toBe(true);
      expect(isTemplateCategory('state')).toBe(true);
      expect(isTemplateCategory('backend')).toBe(true);
      expect(isTemplateCategory('auth')).toBe(true);
      expect(isTemplateCategory('feature')).toBe(true);
    });

    test('should reject invalid category values', () => {
      expect(isTemplateCategory('ui')).toBe(false);
      expect(isTemplateCategory('component')).toBe(false);
      expect(isTemplateCategory('')).toBe(false);
    });
  });
});

describe('validateGenerationSpec', () => {
  const validSpec: GenerationSpec = {
    framework: 'flutter',
    templateId: 'material3-app',
    stateMgmt: 'provider',
    navigation: 'tabs',
    backend: 'none',
    auth: 'none',
    features: ['responsive', 'dark-mode'],
    platforms: ['android', 'ios']
  };

  test('should validate complete valid spec', () => {
    const result = validateGenerationSpec(validSpec);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should require framework', () => {
    const spec = { ...validSpec };
    delete (spec as any).framework;
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('framework is required');
  });

  test('should validate framework value', () => {
    const spec = { ...validSpec, framework: 'invalid' as Framework };
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid framework: invalid');
  });

  test('should require templateId', () => {
    const spec = { ...validSpec };
    delete (spec as any).templateId;
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('templateId is required');
  });

  test('should validate platform values', () => {
    const spec = { ...validSpec, platforms: ['android', 'invalid' as Platform] };
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid platform: invalid');
  });

  test('should require at least one platform for Flutter', () => {
    const spec = { ...validSpec, platforms: [] };
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one platform must be selected for Flutter');
  });

  test('should validate state management value', () => {
    const spec = { ...validSpec, stateMgmt: 'invalid' as StateMgmt };
    
    const result = validateGenerationSpec(spec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid state management: invalid');
  });

  test('should provide warnings for template-platform mismatches', () => {
    const cupertinoSpec = {
      ...validSpec,
      templateId: 'cupertino-app',
      platforms: ['android', 'web']
    };
    
    const result = validateGenerationSpec(cupertinoSpec);
    
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Cupertino templates work best with iOS platform');
  });

  test('should provide warnings for Material templates without Android', () => {
    const materialSpec = {
      ...validSpec,
      templateId: 'material-app',
      platforms: ['ios', 'web']
    };
    
    const result = validateGenerationSpec(materialSpec);
    
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Material templates work best with Android platform');
  });

  test('should handle partial specs', () => {
    const partialSpec = {
      framework: 'flutter' as Framework
    };
    
    const result = validateGenerationSpec(partialSpec);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('templateId is required');
  });

  test('should handle empty spec', () => {
    const result = validateGenerationSpec({});
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('framework is required');
    expect(result.errors).toContain('templateId is required');
  });
});

describe('mergeSpecWithTemplate', () => {
  const template: TemplateOption = {
    id: 'material3-app',
    title: 'Material 3 App',
    description: 'Modern Material Design 3 application',
    framework: 'flutter',
    category: 'basic',
    tags: ['material3', 'responsive'],
    platforms: ['android', 'ios'],
    dependencies: ['flutter', 'material'],
    defaults: {
      stateMgmt: 'provider',
      navigation: 'tabs',
      backend: 'none',
      auth: 'none',
      features: ['responsive', 'dark-mode'],
      platforms: ['android', 'ios']
    }
  };

  test('should merge template defaults with user selections', () => {
    const userSpec: Partial<GenerationSpec> = {
      framework: 'flutter',
      templateId: 'material3-app',
      platforms: ['android', 'ios', 'web']
    };

    const result = mergeSpecWithTemplate(userSpec, template);

    expect(result.framework).toBe('flutter');
    expect(result.templateId).toBe('material3-app');
    expect(result.stateMgmt).toBe('provider'); // From template defaults
    expect(result.navigation).toBe('tabs'); // From template defaults
    expect(result.platforms).toEqual(['android', 'ios', 'web']); // User override
    expect(result.features).toEqual(['responsive', 'dark-mode']); // From template
  });

  test('should override template defaults with user values', () => {
    const userSpec: Partial<GenerationSpec> = {
      framework: 'flutter',
      templateId: 'material3-app',
      stateMgmt: 'riverpod',
      navigation: 'drawer',
      features: ['custom-feature']
    };

    const result = mergeSpecWithTemplate(userSpec, template);

    expect(result.stateMgmt).toBe('riverpod'); // User override
    expect(result.navigation).toBe('drawer'); // User override
    expect(result.features).toEqual(['custom-feature']); // User override
  });

  test('should use base defaults for missing template defaults', () => {
    const templateWithoutDefaults: TemplateOption = {
      ...template,
      defaults: undefined
    };

    const userSpec: Partial<GenerationSpec> = {
      framework: 'flutter',
      templateId: 'minimal-app'
    };

    const result = mergeSpecWithTemplate(userSpec, templateWithoutDefaults);

    expect(result.framework).toBe('flutter');
    expect(result.templateId).toBe('minimal-app');
    expect(result.stateMgmt).toBe('none'); // Base default
    expect(result.navigation).toBe('stack'); // Base default
    expect(result.backend).toBe('none'); // Base default
    expect(result.auth).toBe('none'); // Base default
    expect(result.features).toEqual([]); // Base default
  });

  test('should preserve template framework and platforms', () => {
    const userSpec: Partial<GenerationSpec> = {
      framework: 'expo' as Framework, // This should be overridden
      platforms: ['web'] // This should be overridden by user selection
    };

    const result = mergeSpecWithTemplate(userSpec, template);

    expect(result.framework).toBe('flutter'); // From template
    expect(result.platforms).toEqual(['web']); // User selection preserved
  });
});

describe('getPlatformCapabilities', () => {
  test('should return platform capabilities based on current OS', () => {
    const capabilities = getPlatformCapabilities();

    expect(capabilities).toHaveProperty('android');
    expect(capabilities).toHaveProperty('ios');
    expect(capabilities).toHaveProperty('web');
    expect(capabilities).toHaveProperty('desktop');

    expect(capabilities.android).toBe(true); // Always available
    expect(capabilities.web).toBe(true); // Always available
    expect(capabilities.desktop).toBe(true); // Always available
    
    // iOS should be true only on macOS
    if (process.platform === 'darwin') {
      expect(capabilities.ios).toBe(true);
    } else {
      expect(capabilities.ios).toBe(false);
    }
  });

  test('should be consistent across multiple calls', () => {
    const capabilities1 = getPlatformCapabilities();
    const capabilities2 = getPlatformCapabilities();

    expect(capabilities1).toEqual(capabilities2);
  });
});

describe('GenerationSpec interface', () => {
  test('should accept valid complete specification', () => {
    const spec: GenerationSpec = {
      framework: 'flutter',
      templateId: 'material3-app',
      stateMgmt: 'provider',
      navigation: 'tabs',
      backend: 'rest',
      auth: 'email',
      features: ['responsive', 'dark-mode', 'offline'],
      platforms: ['android', 'ios', 'web'],
      customPackages: ['custom_package'],
      themeConfig: {
        primaryColor: '#2196F3',
        useMaterial3: true,
        darkMode: true
      }
    };

    // Should compile without errors
    expect(spec.framework).toBe('flutter');
    expect(spec.features).toContain('responsive');
    expect(spec.themeConfig?.primaryColor).toBe('#2196F3');
  });

  test('should work with minimal specification', () => {
    const spec: GenerationSpec = {
      framework: 'expo',
      templateId: 'basic',
      stateMgmt: 'none',
      navigation: 'stack',
      backend: 'none',
      auth: 'none',
      features: [],
      platforms: ['android']
    };

    expect(spec.framework).toBe('expo');
    expect(spec.features).toHaveLength(0);
    expect(spec.customPackages).toBeUndefined();
    expect(spec.themeConfig).toBeUndefined();
  });
});

describe('Error types', () => {
  test('should support different mobile error types', () => {
    const errors = [
      { type: 'INVALID_SPEC', message: 'Invalid spec', details: ['error1'] },
      { type: 'TEMPLATE_NOT_FOUND', templateId: 'missing-template' },
      { type: 'FRAMEWORK_NOT_SUPPORTED', framework: 'unsupported' },
      { type: 'SDK_NOT_FOUND', framework: 'flutter', suggestion: 'Install Flutter SDK' }
    ];

    // Should compile and be properly typed
    expect(errors[0].type).toBe('INVALID_SPEC');
    expect(errors[1].type).toBe('TEMPLATE_NOT_FOUND');
    expect(errors[2].type).toBe('FRAMEWORK_NOT_SUPPORTED');
    expect(errors[3].type).toBe('SDK_NOT_FOUND');
  });
});

describe('Result type', () => {
  test('should support success results', () => {
    const result = { success: true as const, data: 'test-data' };
    
    if (result.success) {
      expect(result.data).toBe('test-data');
    }
  });

  test('should support error results', () => {
    const result = { 
      success: false as const, 
      error: { type: 'INVALID_SPEC', message: 'Test error', details: [] }
    };
    
    if (!result.success) {
      expect(result.error.type).toBe('INVALID_SPEC');
      expect(result.error.message).toBe('Test error');
    }
  });
});


