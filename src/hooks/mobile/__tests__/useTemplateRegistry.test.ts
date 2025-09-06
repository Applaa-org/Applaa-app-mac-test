/**
 * Tests for useTemplateRegistry hook and related mobile hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useTemplateRegistry,
  useFrameworkTemplates,
  useCategoryTemplates,
  usePlatformTemplates,
  useBeginnerTemplates,
  useAdvancedTemplates,
  useTemplateSearch,
  useTemplateRecommendations,
  useTemplateComparison
} from '../useTemplateRegistry';

import { vi } from 'vitest';

// Mock the template data
vi.mock('@/data/mobile/templates', () => ({
  ALL_TEMPLATES: [
    {
      id: 'flutter-minimal',
      title: 'Minimal Flutter App',
      description: 'Clean minimal Flutter app',
      framework: 'flutter',
      category: 'basic',
      tags: ['minimal', 'starter'],
      platforms: ['android', 'ios'],
      dependencies: ['flutter'],
      complexity: 1,
      setupTime: 5,
      defaults: {
        stateMgmt: 'none',
        navigation: 'stack',
        backend: 'none',
        auth: 'none',
        features: [],
        platforms: ['android', 'ios']
      }
    },
    {
      id: 'flutter-material3',
      title: 'Material Design 3 App',
      description: 'Modern Material Design 3 application',
      framework: 'flutter',
      category: 'basic',
      tags: ['material3', 'theming'],
      platforms: ['android', 'ios', 'web'],
      dependencies: ['flutter', 'material'],
      complexity: 2,
      setupTime: 10,
      defaults: {
        stateMgmt: 'none',
        navigation: 'tabs',
        backend: 'none',
        auth: 'none',
        features: ['responsive'],
        platforms: ['android', 'ios']
      }
    },
    {
      id: 'flutter-riverpod-app',
      title: 'Riverpod State Management',
      description: 'Modern state management using Riverpod',
      framework: 'flutter',
      category: 'state',
      tags: ['riverpod', 'state-management'],
      platforms: ['android', 'ios', 'web'],
      dependencies: ['flutter', 'flutter_riverpod'],
      complexity: 4,
      setupTime: 25,
      defaults: {
        stateMgmt: 'riverpod',
        navigation: 'tabs',
        backend: 'none',
        auth: 'none',
        features: ['state-management'],
        platforms: ['android', 'ios']
      }
    },
    {
      id: 'expo-basic',
      title: 'Basic Expo App',
      description: 'Simple Expo app with navigation',
      framework: 'expo',
      category: 'basic',
      tags: ['expo', 'react-native'],
      platforms: ['android', 'ios'],
      dependencies: ['expo'],
      complexity: 1,
      setupTime: 5,
      defaults: {
        stateMgmt: 'none',
        navigation: 'stack',
        backend: 'none',
        auth: 'none',
        features: [],
        platforms: ['android', 'ios']
      }
    }
  ],
  getTemplateById: vi.fn((id: string) => {
    const templates = [
      {
        id: 'flutter-minimal',
        title: 'Minimal Flutter App',
        framework: 'flutter',
        category: 'basic',
        tags: ['minimal', 'starter'],
        platforms: ['android', 'ios'],
        complexity: 1,
        setupTime: 5
      },
      {
        id: 'flutter-material3',
        title: 'Material Design 3 App',
        framework: 'flutter',
        category: 'basic',
        tags: ['material3', 'theming'],
        platforms: ['android', 'ios', 'web'],
        complexity: 2,
        setupTime: 10
      },
      {
        id: 'flutter-riverpod-app',
        title: 'Riverpod State Management',
        framework: 'flutter',
        category: 'state',
        tags: ['riverpod', 'state-management'],
        platforms: ['android', 'ios', 'web'],
        complexity: 4,
        setupTime: 25
      },
      {
        id: 'expo-basic',
        title: 'Basic Expo App',
        framework: 'expo',
        category: 'basic',
        tags: ['expo', 'react-native'],
        platforms: ['android', 'ios'],
        complexity: 1,
        setupTime: 5
      }
    ];
    return templates.find(t => t.id === id);
  }),
  getTemplatesByFramework: vi.fn((framework: string) => {
    const allTemplates = [
      {
        id: 'flutter-minimal',
        title: 'Minimal Flutter App',
        framework: 'flutter',
        category: 'basic',
        tags: ['minimal', 'starter'],
        platforms: ['android', 'ios'],
        complexity: 1,
        setupTime: 5
      },
      {
        id: 'flutter-material3',
        title: 'Material Design 3 App',
        framework: 'flutter',
        category: 'basic',
        tags: ['material3', 'theming'],
        platforms: ['android', 'ios', 'web'],
        complexity: 2,
        setupTime: 10
      },
      {
        id: 'flutter-riverpod-app',
        title: 'Riverpod State Management',
        framework: 'flutter',
        category: 'state',
        tags: ['riverpod', 'state-management'],
        platforms: ['android', 'ios', 'web'],
        complexity: 4,
        setupTime: 25
      },
      {
        id: 'expo-basic',
        title: 'Basic Expo App',
        framework: 'expo',
        category: 'basic',
        tags: ['expo', 'react-native'],
        platforms: ['android', 'ios'],
        complexity: 1,
        setupTime: 5
      }
    ];
    return allTemplates.filter(t => t.framework === framework);
  }),
  getTemplatesByCategory: vi.fn(),
  getTemplatesByPlatform: vi.fn(),
  searchTemplates: vi.fn(),
  getTemplatesByComplexity: vi.fn(),
  getFeaturedTemplates: vi.fn(() => [
    { id: 'flutter-material3', title: 'Material Design 3 App', framework: 'flutter' },
    { id: 'flutter-minimal', title: 'Minimal Flutter App', framework: 'flutter' }
  ]),
  getBeginnerTemplates: vi.fn(() => [
    {
      id: 'flutter-minimal',
      title: 'Minimal Flutter App',
      framework: 'flutter',
      category: 'basic',
      complexity: 1,
      setupTime: 5
    },
    {
      id: 'flutter-material3',
      title: 'Material Design 3 App',
      framework: 'flutter',
      category: 'basic',
      complexity: 2,
      setupTime: 10
    },
    {
      id: 'expo-basic',
      title: 'Basic Expo App',
      framework: 'expo',
      category: 'basic',
      complexity: 1,
      setupTime: 5
    }
  ]),
  getTemplatesForUseCase: vi.fn((useCase: string) => {
    if (useCase.toLowerCase().includes('todo')) {
      return [{ id: 'flutter-minimal', framework: 'flutter' }];
    }
    return [];
  }),
  validateTemplateRegistry: vi.fn(() => ({ valid: true, issues: [] })),
  getTemplateStats: vi.fn(() => ({
    total: 4,
    byFramework: { flutter: 3, expo: 1 },
    byCategory: { basic: 3, state: 1 },
    avgSetupTime: 11,
    avgComplexity: 2
  }))
}));

describe('useTemplateRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should initialize with loading state', () => {
    const { result } = renderHook(() => useTemplateRegistry());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.templates).toBeDefined();
  });

  test('should complete loading and provide templates', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(4);
    expect(result.current.error).toBeNull();
    expect(result.current.validation.valid).toBe(true);
    expect(result.current.stats.total).toBe(4);
  });

  test('should filter templates by framework', async () => {
    const { result } = renderHook(() => useTemplateRegistry({ framework: 'flutter' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(3);
    result.current.filteredTemplates.forEach(template => {
      expect(template.framework).toBe('flutter');
    });
  });

  test('should filter templates by category', async () => {
    const { result } = renderHook(() => useTemplateRegistry({ category: 'basic' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(3);
    result.current.filteredTemplates.forEach(template => {
      expect(template.category).toBe('basic');
    });
  });

  test('should filter templates by platforms', async () => {
    const { result } = renderHook(() => useTemplateRegistry({ platforms: ['web'] }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(2);
    result.current.filteredTemplates.forEach(template => {
      expect(template.platforms).toContain('web');
    });
  });

  test('should filter templates by complexity', async () => {
    const { result } = renderHook(() => useTemplateRegistry({ maxComplexity: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(3);
    result.current.filteredTemplates.forEach(template => {
      expect(template.complexity || 1).toBeLessThanOrEqual(2);
    });
  });

  test('should search templates by text', async () => {
    const { result } = renderHook(() => useTemplateRegistry({ search: 'material' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].id).toBe('flutter-material3');
  });

  test('should update query and refilter templates', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filteredTemplates).toHaveLength(4);

    act(() => {
      result.current.setQuery({ framework: 'expo' });
    });

    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].framework).toBe('expo');
  });

  test('should search templates', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.search('expo');
    });

    expect(result.current.query.search).toBe('expo');
  });

  test('should get template by ID', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const template = result.current.getTemplate('flutter-minimal');
    expect(template).toBeDefined();
    expect(template!.id).toBe('flutter-minimal');
  });

  test('should provide featured templates', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.featuredTemplates).toHaveLength(2);
    expect(result.current.featuredTemplates[0].id).toBe('flutter-material3');
  });
});

describe('useFrameworkTemplates', () => {
  test('should return only Flutter templates', async () => {
    const { result } = renderHook(() => useFrameworkTemplates('flutter'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(3);
    result.current.templates.forEach(template => {
      expect(template.framework).toBe('flutter');
    });
  });

  test('should return only Expo templates', async () => {
    const { result } = renderHook(() => useFrameworkTemplates('expo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].framework).toBe('expo');
  });
});

describe('useCategoryTemplates', () => {
  test('should return templates for basic category', async () => {
    const { result } = renderHook(() => useCategoryTemplates('basic'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(3);
    result.current.templates.forEach(template => {
      expect(template.category).toBe('basic');
    });
  });

  test('should return templates for state category', async () => {
    const { result } = renderHook(() => useCategoryTemplates('state'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].category).toBe('state');
  });
});

describe('usePlatformTemplates', () => {
  test('should return templates supporting specified platforms', async () => {
    const { result } = renderHook(() => usePlatformTemplates(['web']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(2);
    result.current.templates.forEach(template => {
      expect(template.platforms).toContain('web');
    });
  });
});

describe('useBeginnerTemplates', () => {
  test('should return beginner-friendly templates', async () => {
    const { result } = renderHook(() => useBeginnerTemplates());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(3);
    result.current.templates.forEach(template => {
      expect(template.complexity || 1).toBeLessThanOrEqual(2);
    });
  });
});

describe('useAdvancedTemplates', () => {
  test('should return advanced templates only', async () => {
    const { result } = renderHook(() => useAdvancedTemplates());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].complexity).toBe(4);
  });
});

describe('useTemplateSearch', () => {
  test('should initialize with empty search', () => {
    const { result } = renderHook(() => useTemplateSearch());

    expect(result.current.searchTerm).toBe('');
    expect(result.current.hasResults).toBe(true); // No filter, so shows all
    expect(result.current.isEmpty).toBe(false);
  });

  test('should update search term', async () => {
    const { result } = renderHook(() => useTemplateSearch());

    act(() => {
      result.current.setSearchTerm('flutter');
    });

    expect(result.current.searchTerm).toBe('flutter');

    // Wait for debounce
    await waitFor(() => {
      expect(result.current.templates).toBeDefined();
    }, { timeout: 500 });
  });

  test('should debounce search term', async () => {
    const { result } = renderHook(() => useTemplateSearch('', 100));

    act(() => {
      result.current.setSearchTerm('test');
    });

    // Should not update immediately
    expect(result.current.templates).toHaveLength(4); // Still showing all

    // Wait for debounce
    await waitFor(() => {
      // After debounce, should be filtered
      expect(result.current.templates.length).toBeLessThanOrEqual(4);
    }, { timeout: 200 });
  });
});

describe('useTemplateRecommendations', () => {
  test('should return featured templates for empty prompt', () => {
    const { result } = renderHook(() => useTemplateRecommendations(''));

    expect(result.current.recommendations).toHaveLength(2);
    expect(result.current.hasRecommendations).toBe(true);
  });

  test('should filter recommendations by framework', () => {
    const { result } = renderHook(() => useTemplateRecommendations('', 'flutter'));

    expect(result.current.recommendations).toHaveLength(2);
    result.current.recommendations.forEach(template => {
      expect(template.id).toContain('flutter');
    });
  });

  test('should return use case specific recommendations', async () => {
    // Mock getTemplatesForUseCase to return specific templates for testing
    const mockGetTemplatesForUseCase = await import('@/data/mobile/templates');
    vi.mocked(mockGetTemplatesForUseCase.getTemplatesForUseCase).mockReturnValue([
      { id: 'flutter-minimal', framework: 'flutter' }
    ]);

    const { result } = renderHook(() => useTemplateRecommendations('todo app'));

    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.recommendations[0].id).toBe('flutter-minimal');
  });
});

describe('useTemplateComparison', () => {
  test('should compare multiple templates', () => {
    const { result } = renderHook(() => 
      useTemplateComparison(['flutter-minimal', 'flutter-material3'])
    );

    expect(result.current.canCompare).toBe(true);
    expect(result.current.templates).toHaveLength(2);
    expect(result.current.comparison).toBeDefined();
    expect(result.current.comparison!.commonPlatforms).toContain('android');
    expect(result.current.comparison!.commonPlatforms).toContain('ios');
  });

  test('should handle single template', () => {
    const { result } = renderHook(() => 
      useTemplateComparison(['flutter-minimal'])
    );

    expect(result.current.canCompare).toBe(false);
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.comparison).toBeNull();
  });

  test('should handle non-existent templates', () => {
    const { result } = renderHook(() => 
      useTemplateComparison(['non-existent'])
    );

    expect(result.current.canCompare).toBe(false);
    expect(result.current.templates).toHaveLength(0);
    expect(result.current.comparison).toBeNull();
  });

  test('should calculate complexity and setup time ranges', () => {
    const { result } = renderHook(() => 
      useTemplateComparison(['flutter-minimal', 'flutter-riverpod-app'])
    );

    expect(result.current.comparison).toBeDefined();
    expect(result.current.comparison!.complexityRange.min).toBe(1);
    expect(result.current.comparison!.complexityRange.max).toBe(4);
    expect(result.current.comparison!.setupTimeRange.min).toBe(5);
    expect(result.current.comparison!.setupTimeRange.max).toBe(25);
  });
});

describe('Hook error handling', () => {
  test('should handle registry validation errors gracefully', async () => {
    // Mock validation to return errors
    const mockValidate = await import('@/data/mobile/templates');
    vi.mocked(mockValidate.validateTemplateRegistry).mockReturnValue({
      valid: false,
      issues: ['Test validation error']
    });

    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.validation.valid).toBe(false);
    expect(result.current.validation.issues).toContain('Test validation error');
  });
});

describe('Hook performance', () => {
  test('should memoize filtered templates correctly', async () => {
    const { result, rerender } = renderHook(
      (props) => useTemplateRegistry(props),
      { initialProps: { framework: 'flutter' as const } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstTemplates = result.current.filteredTemplates;

    // Rerender with same props
    rerender({ framework: 'flutter' as const });

    // Should return same reference (memoized)
    expect(result.current.filteredTemplates).toBe(firstTemplates);
  });

  test('should update filtered templates when query changes', async () => {
    const { result } = renderHook(() => useTemplateRegistry());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const allTemplates = result.current.filteredTemplates;

    act(() => {
      result.current.setQuery({ framework: 'flutter' });
    });

    const flutterTemplates = result.current.filteredTemplates;

    expect(flutterTemplates).not.toBe(allTemplates);
    expect(flutterTemplates.length).toBeLessThan(allTemplates.length);
  });
});
