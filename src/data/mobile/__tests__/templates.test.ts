/**
 * Tests for mobile app templates registry
 */

import {
  FLUTTER_TEMPLATES,
  EXPO_TEMPLATES,
  ALL_TEMPLATES,
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
} from '../templates';

describe('Template Registry Data', () => {
  describe('FLUTTER_TEMPLATES', () => {
    test('should have at least 8 Flutter templates', () => {
      expect(FLUTTER_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    });

    test('should have unique template IDs', () => {
      const ids = FLUTTER_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should have valid template structure', () => {
      FLUTTER_TEMPLATES.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.title).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.framework).toBe('flutter');
        expect(template.category).toMatch(/^(basic|navigation|state|backend|auth|feature)$/);
        expect(Array.isArray(template.platforms)).toBe(true);
        expect(template.platforms.length).toBeGreaterThan(0);
        expect(Array.isArray(template.dependencies)).toBe(true);
        expect(template.dependencies.length).toBeGreaterThan(0);
        expect(Array.isArray(template.tags)).toBe(true);
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });

    test('should have complexity values between 1-5', () => {
      FLUTTER_TEMPLATES.forEach(template => {
        if (template.complexity !== undefined) {
          expect(template.complexity).toBeGreaterThanOrEqual(1);
          expect(template.complexity).toBeLessThanOrEqual(5);
        }
      });
    });

    test('should have reasonable setup times', () => {
      FLUTTER_TEMPLATES.forEach(template => {
        if (template.setupTime !== undefined) {
          expect(template.setupTime).toBeGreaterThan(0);
          expect(template.setupTime).toBeLessThanOrEqual(120); // Max 2 hours seems reasonable
        }
      });
    });

    test('should include essential basic templates', () => {
      const basicTemplates = FLUTTER_TEMPLATES.filter(t => t.category === 'basic');
      expect(basicTemplates.length).toBeGreaterThanOrEqual(3);

      const ids = basicTemplates.map(t => t.id);
      expect(ids).toContain('flutter-minimal');
      expect(ids).toContain('flutter-material3');
      expect(ids).toContain('flutter-cupertino');
    });

    test('should include state management templates', () => {
      const stateTemplates = FLUTTER_TEMPLATES.filter(t => t.category === 'state');
      expect(stateTemplates.length).toBeGreaterThanOrEqual(3);

      const ids = stateTemplates.map(t => t.id);
      expect(ids).toContain('flutter-provider-app');
      expect(ids).toContain('flutter-riverpod-app');
      expect(ids).toContain('flutter-bloc-app');
    });

    test('should include backend integration templates', () => {
      const backendTemplates = FLUTTER_TEMPLATES.filter(t => t.category === 'backend');
      expect(backendTemplates.length).toBeGreaterThanOrEqual(2);

      const ids = backendTemplates.map(t => t.id);
      expect(ids).toContain('flutter-rest-api');
      expect(ids).toContain('flutter-firebase-app');
    });
  });

  describe('EXPO_TEMPLATES', () => {
    test('should have Expo templates', () => {
      expect(EXPO_TEMPLATES.length).toBeGreaterThan(0);
    });

    test('should have valid Expo template structure', () => {
      EXPO_TEMPLATES.forEach(template => {
        expect(template.framework).toBe('expo');
        expect(template.id).toBeTruthy();
        expect(template.title).toBeTruthy();
        expect(template.description).toBeTruthy();
      });
    });

    test('should include basic Expo template', () => {
      const basicExpo = EXPO_TEMPLATES.find(t => t.id === 'expo-basic');
      expect(basicExpo).toBeDefined();
      expect(basicExpo!.category).toBe('basic');
    });
  });

  describe('ALL_TEMPLATES', () => {
    test('should combine Flutter and Expo templates', () => {
      expect(ALL_TEMPLATES.length).toBe(FLUTTER_TEMPLATES.length + EXPO_TEMPLATES.length);
    });

    test('should maintain unique IDs across all templates', () => {
      const ids = ALL_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

describe('Template Registry Functions', () => {
  describe('getTemplateById', () => {
    test('should return template for valid ID', () => {
      const template = getTemplateById('flutter-material3');
      expect(template).toBeDefined();
      expect(template!.id).toBe('flutter-material3');
      expect(template!.framework).toBe('flutter');
    });

    test('should return undefined for invalid ID', () => {
      const template = getTemplateById('non-existent-template');
      expect(template).toBeUndefined();
    });

    test('should work for Expo templates', () => {
      const template = getTemplateById('expo-basic');
      expect(template).toBeDefined();
      expect(template!.framework).toBe('expo');
    });
  });

  describe('getTemplatesByFramework', () => {
    test('should return only Flutter templates', () => {
      const templates = getTemplatesByFramework('flutter');
      expect(templates.length).toBe(FLUTTER_TEMPLATES.length);
      templates.forEach(template => {
        expect(template.framework).toBe('flutter');
      });
    });

    test('should return only Expo templates', () => {
      const templates = getTemplatesByFramework('expo');
      expect(templates.length).toBe(EXPO_TEMPLATES.length);
      templates.forEach(template => {
        expect(template.framework).toBe('expo');
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    test('should return templates for basic category', () => {
      const templates = getTemplatesByCategory('basic');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template.category).toBe('basic');
      });
    });

    test('should return templates for state category', () => {
      const templates = getTemplatesByCategory('state');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template.category).toBe('state');
      });
    });

    test('should return empty array for non-existent category', () => {
      const templates = getTemplatesByCategory('non-existent' as any);
      expect(templates).toEqual([]);
    });
  });

  describe('getTemplatesByPlatform', () => {
    test('should return templates supporting Android', () => {
      const templates = getTemplatesByPlatform('android');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template.platforms).toContain('android');
      });
    });

    test('should return templates supporting iOS', () => {
      const templates = getTemplatesByPlatform('ios');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template.platforms).toContain('ios');
      });
    });

    test('should return templates supporting web', () => {
      const templates = getTemplatesByPlatform('web');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(template => {
        expect(template.platforms).toContain('web');
      });
    });

    test('should return templates supporting desktop', () => {
      const templates = getTemplatesByPlatform('desktop');
      templates.forEach(template => {
        expect(template.platforms).toContain('desktop');
      });
    });
  });

  describe('searchTemplates', () => {
    test('should find templates by title', () => {
      const templates = searchTemplates('Material');
      expect(templates.length).toBeGreaterThan(0);
      
      const materialTemplate = templates.find(t => t.id === 'flutter-material3');
      expect(materialTemplate).toBeDefined();
    });

    test('should find templates by description', () => {
      const templates = searchTemplates('navigation');
      expect(templates.length).toBeGreaterThan(0);
      
      // Should include templates with navigation in description
      const hasNavigationInDescription = templates.some(t => 
        t.description.toLowerCase().includes('navigation')
      );
      expect(hasNavigationInDescription).toBe(true);
    });

    test('should find templates by tags', () => {
      const templates = searchTemplates('responsive');
      expect(templates.length).toBeGreaterThan(0);
      
      const hasResponsiveTag = templates.some(t =>
        t.tags.some(tag => tag.toLowerCase().includes('responsive'))
      );
      expect(hasResponsiveTag).toBe(true);
    });

    test('should be case insensitive', () => {
      const lowerCase = searchTemplates('material');
      const upperCase = searchTemplates('MATERIAL');
      const mixedCase = searchTemplates('Material');
      
      expect(lowerCase).toEqual(upperCase);
      expect(lowerCase).toEqual(mixedCase);
    });

    test('should return empty array for no matches', () => {
      const templates = searchTemplates('xyz-non-existent-term');
      expect(templates).toEqual([]);
    });

    test('should handle empty search term', () => {
      const templates = searchTemplates('');
      expect(templates).toEqual([]);
    });
  });

  describe('getTemplatesByComplexity', () => {
    test('should return templates with complexity <= specified value', () => {
      const simpleTemplates = getTemplatesByComplexity(2);
      simpleTemplates.forEach(template => {
        const complexity = template.complexity || 1;
        expect(complexity).toBeLessThanOrEqual(2);
      });
    });

    test('should include templates without complexity (default to 1)', () => {
      const allSimple = getTemplatesByComplexity(1);
      expect(allSimple.length).toBeGreaterThan(0);
    });

    test('should return all templates for max complexity', () => {
      const allTemplates = getTemplatesByComplexity(5);
      expect(allTemplates.length).toBe(ALL_TEMPLATES.length);
    });

    test('should return empty array for zero complexity', () => {
      const noTemplates = getTemplatesByComplexity(0);
      expect(noTemplates).toEqual([]);
    });
  });

  describe('getFeaturedTemplates', () => {
    test('should return featured templates', () => {
      const featured = getFeaturedTemplates();
      expect(featured.length).toBeGreaterThan(0);
      expect(featured.length).toBeLessThanOrEqual(10); // Reasonable limit
    });

    test('should include high-quality templates', () => {
      const featured = getFeaturedTemplates();
      const ids = featured.map(t => t.id);
      
      // Should include some key templates
      expect(ids).toContain('flutter-material3');
      expect(ids).toContain('flutter-cupertino');
    });

    test('should return valid templates', () => {
      const featured = getFeaturedTemplates();
      featured.forEach(template => {
        expect(template).toBeDefined();
        expect(template.id).toBeTruthy();
        expect(template.framework).toBeTruthy();
      });
    });
  });

  describe('getBeginnerTemplates', () => {
    test('should return beginner-friendly templates', () => {
      const beginner = getBeginnerTemplates();
      expect(beginner.length).toBeGreaterThan(0);
    });

    test('should have low complexity and setup time', () => {
      const beginner = getBeginnerTemplates();
      beginner.forEach(template => {
        const complexity = template.complexity || 1;
        const setupTime = template.setupTime || 0;
        
        expect(complexity).toBeLessThanOrEqual(2);
        expect(setupTime).toBeLessThanOrEqual(15);
      });
    });

    test('should include basic templates', () => {
      const beginner = getBeginnerTemplates();
      const ids = beginner.map(t => t.id);
      
      expect(ids).toContain('flutter-minimal');
    });
  });

  describe('getTemplatesForUseCase', () => {
    test('should return relevant templates for todo use case', () => {
      const templates = getTemplatesForUseCase('todo app');
      expect(templates.length).toBeGreaterThan(0);
      
      // Should include basic templates suitable for todo apps
      const ids = templates.map(t => t.id);
      expect(ids).toContain('flutter-minimal');
    });

    test('should return relevant templates for ecommerce use case', () => {
      const templates = getTemplatesForUseCase('ecommerce shop');
      expect(templates.length).toBeGreaterThan(0);
      
      const ids = templates.map(t => t.id);
      expect(ids).toContain('flutter-ecommerce');
    });

    test('should return relevant templates for social use case', () => {
      const templates = getTemplatesForUseCase('social media app');
      expect(templates.length).toBeGreaterThan(0);
      
      const ids = templates.map(t => t.id);
      expect(ids).toContain('flutter-social-app');
    });

    test('should fallback to search for unknown use cases', () => {
      const templates = getTemplatesForUseCase('custom business app');
      expect(Array.isArray(templates)).toBe(true);
      // Should still return some templates, even if not perfect matches
    });

    test('should handle empty use case', () => {
      const templates = getTemplatesForUseCase('');
      expect(Array.isArray(templates)).toBe(true);
    });
  });
});

describe('Registry Validation', () => {
  describe('validateTemplateRegistry', () => {
    test('should validate the template registry successfully', () => {
      const validation = validateTemplateRegistry();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    test('should detect duplicate IDs if they exist', () => {
      // This test ensures our registry doesn't have duplicates
      const ids = ALL_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should ensure all templates have required fields', () => {
      ALL_TEMPLATES.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.title).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.platforms.length).toBeGreaterThan(0);
        expect(template.dependencies.length).toBeGreaterThan(0);
      });
    });

    test('should ensure complexity values are in valid range', () => {
      ALL_TEMPLATES.forEach(template => {
        if (template.complexity !== undefined) {
          expect(template.complexity).toBeGreaterThanOrEqual(1);
          expect(template.complexity).toBeLessThanOrEqual(5);
        }
      });
    });
  });
});

describe('Registry Statistics', () => {
  describe('getTemplateStats', () => {
    test('should return comprehensive statistics', () => {
      const stats = getTemplateStats();
      
      expect(stats.total).toBe(ALL_TEMPLATES.length);
      expect(stats.byFramework).toHaveProperty('flutter');
      expect(stats.byFramework).toHaveProperty('expo');
      expect(stats.byCategory).toHaveProperty('basic');
      expect(stats.avgSetupTime).toBeGreaterThanOrEqual(0);
      expect(stats.avgComplexity).toBeGreaterThanOrEqual(0);
    });

    test('should count frameworks correctly', () => {
      const stats = getTemplateStats();
      
      expect(stats.byFramework.flutter).toBe(FLUTTER_TEMPLATES.length);
      expect(stats.byFramework.expo).toBe(EXPO_TEMPLATES.length);
    });

    test('should count categories correctly', () => {
      const stats = getTemplateStats();
      
      const basicCount = ALL_TEMPLATES.filter(t => t.category === 'basic').length;
      expect(stats.byCategory.basic).toBe(basicCount);
    });

    test('should calculate averages correctly', () => {
      const stats = getTemplateStats();
      
      // Calculate expected averages
      const templatesWithSetupTime = ALL_TEMPLATES.filter(t => t.setupTime !== undefined);
      const templatesWithComplexity = ALL_TEMPLATES.filter(t => t.complexity !== undefined);
      
      if (templatesWithSetupTime.length > 0) {
        const expectedAvgSetupTime = Math.round(
          templatesWithSetupTime.reduce((sum, t) => sum + (t.setupTime || 0), 0) / templatesWithSetupTime.length
        );
        expect(stats.avgSetupTime).toBe(expectedAvgSetupTime);
      }
      
      if (templatesWithComplexity.length > 0) {
        const expectedAvgComplexity = Math.round(
          (templatesWithComplexity.reduce((sum, t) => sum + (t.complexity || 0), 0) / templatesWithComplexity.length) * 10
        ) / 10;
        expect(stats.avgComplexity).toBe(expectedAvgComplexity);
      }
    });
  });
});

describe('Template Data Quality', () => {
  test('should have meaningful descriptions', () => {
    ALL_TEMPLATES.forEach(template => {
      expect(template.description.length).toBeGreaterThan(20);
      expect(template.description).not.toBe(template.title);
    });
  });

  test('should have relevant tags', () => {
    ALL_TEMPLATES.forEach(template => {
      expect(template.tags.length).toBeGreaterThan(0);
      template.tags.forEach(tag => {
        expect(tag.length).toBeGreaterThan(1);
        expect(tag).not.toContain(' '); // Tags should not have spaces
      });
    });
  });

  test('should have appropriate platforms for framework', () => {
    FLUTTER_TEMPLATES.forEach(template => {
      // Flutter templates should support at least one mobile platform
      const supportsMobile = template.platforms.includes('android') || template.platforms.includes('ios');
      expect(supportsMobile).toBe(true);
    });

    EXPO_TEMPLATES.forEach(template => {
      // Expo templates should support mobile platforms
      const supportsMobile = template.platforms.includes('android') || template.platforms.includes('ios');
      expect(supportsMobile).toBe(true);
    });
  });

  test('should have reasonable dependency lists', () => {
    ALL_TEMPLATES.forEach(template => {
      expect(template.dependencies.length).toBeGreaterThan(0);
      expect(template.dependencies.length).toBeLessThan(20); // Reasonable upper limit
      
      // Should include framework dependency
      if (template.framework === 'flutter') {
        expect(template.dependencies).toContain('flutter');
      } else if (template.framework === 'expo') {
        expect(template.dependencies).toContain('expo');
      }
    });
  });

  test('should have consistent ID naming conventions', () => {
    ALL_TEMPLATES.forEach(template => {
      // IDs should be lowercase with hyphens
      expect(template.id).toMatch(/^[a-z0-9-]+$/);
      expect(template.id).toContain(template.framework);
    });
  });
});
