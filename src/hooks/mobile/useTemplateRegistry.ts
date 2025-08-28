/**
 * Template Registry React Hook
 * 
 * This hook provides access to the mobile app template registry with filtering,
 * searching, and validation capabilities.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  TemplateOption, 
  TemplateQuery, 
  Framework, 
  TemplateCategory, 
  Platform 
} from '@/lib/mobile/types';
import {
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
} from '@/data/mobile/templates';

/**
 * Hook return type
 */
interface UseTemplateRegistryReturn {
  /** All available templates */
  templates: TemplateOption[];
  
  /** Filtered templates based on current query */
  filteredTemplates: TemplateOption[];
  
  /** Featured/recommended templates */
  featuredTemplates: TemplateOption[];
  
  /** Beginner-friendly templates */
  beginnerTemplates: TemplateOption[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Current filter query */
  query: TemplateQuery;
  
  /** Update filter query */
  setQuery: (query: Partial<TemplateQuery>) => void;
  
  /** Search templates by text */
  search: (searchText: string) => void;
  
  /** Get template by ID */
  getTemplate: (id: string) => TemplateOption | undefined;
  
  /** Get templates for specific use case */
  getForUseCase: (useCase: string) => TemplateOption[];
  
  /** Registry statistics */
  stats: ReturnType<typeof getTemplateStats>;
  
  /** Registry validation result */
  validation: ReturnType<typeof validateTemplateRegistry>;
}

/**
 * Default query state
 */
const DEFAULT_QUERY: TemplateQuery = {
  framework: undefined,
  category: undefined,
  platforms: undefined,
  search: undefined,
  maxComplexity: undefined
};

/**
 * Hook for managing mobile app template registry
 */
export function useTemplateRegistry(initialQuery: Partial<TemplateQuery> = {}): UseTemplateRegistryReturn {
  const [query, setQueryState] = useState<TemplateQuery>({
    ...DEFAULT_QUERY,
    ...initialQuery
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the registry (simulate async loading)
  useEffect(() => {
    const initializeRegistry = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simulate network delay for realistic loading state
        await new Promise(resolve => setTimeout(resolve, 100));

        // Validate registry on load
        const validation = validateTemplateRegistry();
        if (!validation.valid) {
          console.warn('Template registry validation issues:', validation.issues);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load templates'));
        setIsLoading(false);
      }
    };

    initializeRegistry();
  }, []);

  // Memoized filtered templates based on current query
  const filteredTemplates = useMemo(() => {
    let templates = ALL_TEMPLATES;

    // Filter by framework
    if (query.framework) {
      templates = getTemplatesByFramework(query.framework);
    }

    // Filter by category
    if (query.category) {
      templates = templates.filter(t => t.category === query.category);
    }

    // Filter by platforms
    if (query.platforms && query.platforms.length > 0) {
      templates = templates.filter(template =>
        query.platforms!.some(platform => template.platforms.includes(platform))
      );
    }

    // Filter by complexity
    if (query.maxComplexity !== undefined) {
      templates = templates.filter(template =>
        (template.complexity || 1) <= query.maxComplexity!
      );
    }

    // Apply search filter
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.toLowerCase();
      templates = templates.filter(template =>
        template.title.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return templates;
  }, [query]);

  // Memoized featured templates
  const featuredTemplates = useMemo(() => getFeaturedTemplates(), []);

  // Memoized beginner templates
  const beginnerTemplates = useMemo(() => getBeginnerTemplates(), []);

  // Memoized statistics
  const stats = useMemo(() => getTemplateStats(), []);

  // Memoized validation
  const validation = useMemo(() => validateTemplateRegistry(), []);

  // Update query function
  const setQuery = (newQuery: Partial<TemplateQuery>) => {
    setQueryState(prev => ({ ...prev, ...newQuery }));
  };

  // Search function
  const search = (searchText: string) => {
    setQuery({ search: searchText });
  };

  // Get template by ID function
  const getTemplate = (id: string) => getTemplateById(id);

  // Get templates for use case function
  const getForUseCase = (useCase: string) => getTemplatesForUseCase(useCase);

  return {
    templates: ALL_TEMPLATES,
    filteredTemplates,
    featuredTemplates,
    beginnerTemplates,
    isLoading,
    error,
    query,
    setQuery,
    search,
    getTemplate,
    getForUseCase,
    stats,
    validation
  };
}

/**
 * Hook for framework-specific templates
 */
export function useFrameworkTemplates(framework: Framework) {
  const { filteredTemplates, isLoading, error } = useTemplateRegistry({ framework });

  return {
    templates: filteredTemplates,
    isLoading,
    error
  };
}

/**
 * Hook for category-specific templates
 */
export function useCategoryTemplates(category: TemplateCategory) {
  const { filteredTemplates, isLoading, error } = useTemplateRegistry({ category });

  return {
    templates: filteredTemplates,
    isLoading,
    error
  };
}

/**
 * Hook for platform-specific templates
 */
export function usePlatformTemplates(platforms: Platform[]) {
  const { filteredTemplates, isLoading, error } = useTemplateRegistry({ platforms });

  return {
    templates: filteredTemplates,
    isLoading,
    error
  };
}

/**
 * Hook for beginner-friendly templates with complexity filtering
 */
export function useBeginnerTemplates() {
  const { filteredTemplates, isLoading, error } = useTemplateRegistry({ maxComplexity: 2 });

  return {
    templates: filteredTemplates,
    isLoading,
    error
  };
}

/**
 * Hook for advanced templates
 */
export function useAdvancedTemplates() {
  const { filteredTemplates, isLoading, error } = useTemplateRegistry({ maxComplexity: 5 });

  // Filter for complexity 4-5
  const advancedTemplates = useMemo(() =>
    filteredTemplates.filter(template => (template.complexity || 1) >= 4),
    [filteredTemplates]
  );

  return {
    templates: advancedTemplates,
    isLoading,
    error
  };
}

/**
 * Hook for template search with debouncing
 */
export function useTemplateSearch(initialSearchTerm = '', debounceMs = 300) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { filteredTemplates, isLoading, error } = useTemplateRegistry({
    search: debouncedSearchTerm
  });

  return {
    searchTerm,
    setSearchTerm,
    templates: filteredTemplates,
    isLoading,
    error,
    hasResults: filteredTemplates.length > 0,
    isEmpty: debouncedSearchTerm.trim() !== '' && filteredTemplates.length === 0
  };
}

/**
 * Hook for template recommendations based on user input/prompt
 */
export function useTemplateRecommendations(userPrompt: string, framework?: Framework) {
  const { getForUseCase, featuredTemplates } = useTemplateRegistry();

  const recommendations = useMemo(() => {
    if (!userPrompt.trim()) {
      // No prompt, return featured templates for the framework
      return framework 
        ? featuredTemplates.filter(t => t.framework === framework)
        : featuredTemplates;
    }

    // Get recommendations based on prompt content
    let recommended = getForUseCase(userPrompt);

    // Filter by framework if specified
    if (framework) {
      recommended = recommended.filter(t => t.framework === framework);
    }

    // If no specific recommendations, fall back to featured templates
    if (recommended.length === 0) {
      recommended = framework
        ? featuredTemplates.filter(t => t.framework === framework)
        : featuredTemplates.slice(0, 3);
    }

    // Limit to top 6 recommendations
    return recommended.slice(0, 6);
  }, [userPrompt, framework, getForUseCase, featuredTemplates]);

  return {
    recommendations,
    hasRecommendations: recommendations.length > 0
  };
}

/**
 * Hook for template comparison
 */
export function useTemplateComparison(templateIds: string[]) {
  const { getTemplate } = useTemplateRegistry();

  const templates = useMemo(() =>
    templateIds.map(id => getTemplate(id)).filter(Boolean) as TemplateOption[],
    [templateIds, getTemplate]
  );

  const comparison = useMemo(() => {
    if (templates.length < 2) return null;

    return {
      templates,
      commonPlatforms: templates.reduce(
        (common, template) => 
          common.filter(platform => template.platforms.includes(platform)),
        templates[0].platforms
      ),
      complexityRange: {
        min: Math.min(...templates.map(t => t.complexity || 1)),
        max: Math.max(...templates.map(t => t.complexity || 1))
      },
      setupTimeRange: {
        min: Math.min(...templates.map(t => t.setupTime || 0)),
        max: Math.max(...templates.map(t => t.setupTime || 0))
      },
      allFeatures: Array.from(
        new Set(templates.flatMap(t => t.defaults?.features || []))
      ),
      sharedCategories: templates.every(t => t.category === templates[0].category)
    };
  }, [templates]);

  return {
    templates,
    comparison,
    canCompare: templates.length >= 2
  };
}


