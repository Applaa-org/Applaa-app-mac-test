/**
 * Prompt Enrichment React Hook
 * 
 * Provides React hooks for intelligent prompt enrichment in mobile app generation.
 * Integrates with the GenerationSpec system to enhance LLM prompts with structured data.
 */

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  enrichPromptForMobileGeneration,
  generateSimplePrompt,
  analyzePromptEnrichment,
  type EnrichedPrompt,
  type PromptEnrichmentConfig,
  DEFAULT_ENRICHMENT_CONFIG
} from '@/lib/mobile/prompt-enrichment';
import { 
  validateGenerationSpec,
  optimizeGenerationSpec,
  specToSummary,
  calculateSpecComplexity
} from '@/lib/mobile/generation-spec-utils';
import { useTemplateRegistry } from './useTemplateRegistry';
import type { GenerationSpec, TemplateOption } from '@/lib/mobile/types';

/**
 * Prompt enrichment options
 */
export interface PromptEnrichmentOptions {
  /** Custom enrichment configuration */
  config?: Partial<PromptEnrichmentConfig>;
  
  /** Whether to validate the spec before enrichment */
  validateSpec?: boolean;
  
  /** Whether to optimize the spec before enrichment */
  optimizeSpec?: boolean;
  
  /** Whether to include analytics */
  includeAnalytics?: boolean;
}

/**
 * Enrichment result with additional metadata
 */
export interface EnrichmentResult extends EnrichedPrompt {
  /** Validation result if requested */
  validation?: ReturnType<typeof validateGenerationSpec>;
  
  /** Optimization result if requested */
  optimization?: ReturnType<typeof optimizeGenerationSpec>;
  
  /** Complexity analysis */
  complexity?: ReturnType<typeof calculateSpecComplexity>;
  
  /** Analytics data */
  analytics?: ReturnType<typeof analyzePromptEnrichment>;
}

/**
 * Hook for prompt enrichment with comprehensive features
 */
export function usePromptEnrichment() {
  const [enrichmentHistory, setEnrichmentHistory] = useState<EnrichmentResult[]>([]);
  const { getTemplateById } = useTemplateRegistry();

  // Enrich prompt mutation
  const enrichPromptMutation = useMutation({
    mutationFn: async ({
      userPrompt,
      spec,
      options = {}
    }: {
      userPrompt: string;
      spec: GenerationSpec;
      options?: PromptEnrichmentOptions;
    }): Promise<EnrichmentResult> => {
      const {
        config = {},
        validateSpec = true,
        optimizeSpec = true,
        includeAnalytics = true
      } = options;

      console.log('[PromptEnrichment] Starting enrichment process...');

      // Get template information
      const template = getTemplateById(spec.templateId);
      if (!template) {
        throw new Error(`Template not found: ${spec.templateId}`);
      }

      let workingSpec = spec;
      let validation: ReturnType<typeof validateGenerationSpec> | undefined;
      let optimization: ReturnType<typeof optimizeGenerationSpec> | undefined;

      // Validate spec if requested
      if (validateSpec) {
        validation = validateGenerationSpec(workingSpec);
        console.log('[PromptEnrichment] Validation:', validation.valid ? 'passed' : 'failed');
        
        if (!validation.valid) {
          console.warn('[PromptEnrichment] Validation errors:', validation.errors);
        }
      }

      // Optimize spec if requested
      if (optimizeSpec) {
        optimization = optimizeGenerationSpec(workingSpec);
        workingSpec = optimization.optimizedSpec;
        console.log('[PromptEnrichment] Optimization changes:', optimization.changes.length);
      }

      // Perform enrichment
      const enrichmentConfig = { ...DEFAULT_ENRICHMENT_CONFIG, ...config };
      const enrichedPrompt = enrichPromptForMobileGeneration(
        userPrompt,
        workingSpec,
        template,
        enrichmentConfig
      );

      console.log('[PromptEnrichment] Enrichment completed:', {
        originalLength: enrichedPrompt.originalPrompt.length,
        enrichedLength: enrichedPrompt.length,
        sections: enrichedPrompt.includedSections.length
      });

      // Calculate complexity
      const complexity = calculateSpecComplexity(workingSpec);

      // Generate analytics if requested
      let analytics: ReturnType<typeof analyzePromptEnrichment> | undefined;
      if (includeAnalytics) {
        analytics = analyzePromptEnrichment(enrichedPrompt);
      }

      const result: EnrichmentResult = {
        ...enrichedPrompt,
        validation,
        optimization,
        complexity,
        analytics
      };

      // Add to history
      setEnrichmentHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10

      return result;
    },
    onError: (error) => {
      console.error('[PromptEnrichment] Enrichment failed:', error);
    }
  });

  // Clear history function
  const clearHistory = useCallback(() => {
    setEnrichmentHistory([]);
  }, []);

  // Get enrichment statistics
  const enrichmentStats = useMemo(() => {
    if (enrichmentHistory.length === 0) {
      return null;
    }

    const totalEnrichments = enrichmentHistory.length;
    const avgOriginalLength = enrichmentHistory.reduce((sum, item) => 
      sum + item.originalPrompt.length, 0) / totalEnrichments;
    const avgEnrichedLength = enrichmentHistory.reduce((sum, item) => 
      sum + item.length, 0) / totalEnrichments;
    const avgEnrichmentRatio = enrichmentHistory.reduce((sum, item) => 
      sum + (item.analytics?.enrichmentRatio || 0), 0) / totalEnrichments;
    const truncationRate = enrichmentHistory.filter(item => 
      item.wasTruncated).length / totalEnrichments;

    return {
      totalEnrichments,
      avgOriginalLength: Math.round(avgOriginalLength),
      avgEnrichedLength: Math.round(avgEnrichedLength),
      avgEnrichmentRatio: Math.round(avgEnrichmentRatio * 100) / 100,
      truncationRate: Math.round(truncationRate * 100)
    };
  }, [enrichmentHistory]);

  return {
    enrichPrompt: enrichPromptMutation.mutateAsync,
    isEnriching: enrichPromptMutation.isPending,
    enrichmentError: enrichPromptMutation.error,
    enrichmentHistory,
    enrichmentStats,
    clearHistory,
    reset: enrichPromptMutation.reset
  };
}

/**
 * Hook for simple prompt enrichment without advanced features
 */
export function useSimplePromptEnrichment() {
  const { getTemplateById } = useTemplateRegistry();

  const enrichPromptMutation = useMutation({
    mutationFn: async ({
      userPrompt,
      spec
    }: {
      userPrompt: string;
      spec: GenerationSpec;
    }): Promise<EnrichedPrompt> => {
      const template = getTemplateById(spec.templateId);
      if (!template) {
        throw new Error(`Template not found: ${spec.templateId}`);
      }

      return enrichPromptForMobileGeneration(userPrompt, spec, template);
    }
  });

  return {
    enrichPrompt: enrichPromptMutation.mutateAsync,
    isEnriching: enrichPromptMutation.isPending,
    error: enrichPromptMutation.error,
    reset: enrichPromptMutation.reset
  };
}

/**
 * Hook for prompt comparison and A/B testing
 */
export function usePromptComparison() {
  const [comparisons, setComparisons] = useState<{
    id: string;
    userPrompt: string;
    spec: GenerationSpec;
    enriched: EnrichedPrompt;
    simple: string;
    timestamp: Date;
  }[]>([]);

  const { getTemplateById } = useTemplateRegistry();

  const createComparison = useCallback(async (
    userPrompt: string,
    spec: GenerationSpec,
    config?: Partial<PromptEnrichmentConfig>
  ) => {
    const template = getTemplateById(spec.templateId);
    if (!template) {
      throw new Error(`Template not found: ${spec.templateId}`);
    }

    const enriched = enrichPromptForMobileGeneration(userPrompt, spec, template, config);
    const simple = generateSimplePrompt(userPrompt, spec);

    const comparison = {
      id: Date.now().toString(),
      userPrompt,
      spec,
      enriched,
      simple,
      timestamp: new Date()
    };

    setComparisons(prev => [comparison, ...prev.slice(0, 4)]); // Keep last 5

    return comparison;
  }, [getTemplateById]);

  const clearComparisons = useCallback(() => {
    setComparisons([]);
  }, []);

  return {
    comparisons,
    createComparison,
    clearComparisons
  };
}

/**
 * Hook for real-time spec validation
 */
export function useSpecValidation(spec: GenerationSpec | null) {
  return useQuery({
    queryKey: ['spec-validation', spec],
    queryFn: () => {
      if (!spec) return null;
      return validateGenerationSpec(spec);
    },
    enabled: spec !== null,
    staleTime: 1000, // Re-validate quickly for real-time feedback
    meta: {
      showErrorToast: false
    }
  });
}

/**
 * Hook for spec optimization suggestions
 */
export function useSpecOptimization() {
  const optimizeMutation = useMutation({
    mutationFn: async (spec: GenerationSpec) => {
      return optimizeGenerationSpec(spec);
    }
  });

  return {
    optimizeSpec: optimizeMutation.mutateAsync,
    isOptimizing: optimizeMutation.isPending,
    optimizationResult: optimizeMutation.data,
    error: optimizeMutation.error,
    reset: optimizeMutation.reset
  };
}

/**
 * Hook for spec complexity analysis
 */
export function useSpecComplexity(spec: GenerationSpec | null) {
  return useMemo(() => {
    if (!spec) return null;
    return calculateSpecComplexity(spec);
  }, [spec]);
}

/**
 * Hook for prompt enrichment configuration management
 */
export function useEnrichmentConfig() {
  const [config, setConfig] = useState<PromptEnrichmentConfig>(DEFAULT_ENRICHMENT_CONFIG);

  const updateConfig = useCallback((updates: Partial<PromptEnrichmentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_ENRICHMENT_CONFIG);
  }, []);

  const presets = useMemo(() => ({
    minimal: {
      includePlatformGuidance: false,
      includeFrameworkBestPractices: true,
      includeTemplatePatterns: true,
      includeDependencyGuidance: false,
      includeArchitectureGuidance: false,
      maxPromptLength: 4000
    } as PromptEnrichmentConfig,
    
    balanced: DEFAULT_ENRICHMENT_CONFIG,
    
    comprehensive: {
      includePlatformGuidance: true,
      includeFrameworkBestPractices: true,
      includeTemplatePatterns: true,
      includeDependencyGuidance: true,
      includeArchitectureGuidance: true,
      maxPromptLength: 12000
    } as PromptEnrichmentConfig
  }), []);

  const applyPreset = useCallback((preset: keyof typeof presets) => {
    setConfig(presets[preset]);
  }, [presets]);

  return {
    config,
    updateConfig,
    resetConfig,
    presets,
    applyPreset
  };
}

/**
 * Hook for batch prompt enrichment (for testing multiple variations)
 */
export function useBatchEnrichment() {
  const [batchResults, setBatchResults] = useState<EnrichmentResult[]>([]);
  const { getTemplateById } = useTemplateRegistry();

  const enrichBatch = useMutation({
    mutationFn: async ({
      userPrompt,
      specs,
      configs = []
    }: {
      userPrompt: string;
      specs: GenerationSpec[];
      configs?: Partial<PromptEnrichmentConfig>[];
    }): Promise<EnrichmentResult[]> => {
      const results: EnrichmentResult[] = [];

      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const config = configs[i] || {};

        const template = getTemplateById(spec.templateId);
        if (!template) {
          console.warn(`Template not found: ${spec.templateId}, skipping...`);
          continue;
        }

        const enriched = enrichPromptForMobileGeneration(userPrompt, spec, template, config);
        const validation = validateGenerationSpec(spec);
        const complexity = calculateSpecComplexity(spec);
        const analytics = analyzePromptEnrichment(enriched);

        results.push({
          ...enriched,
          validation,
          complexity,
          analytics
        });
      }

      setBatchResults(results);
      return results;
    }
  });

  const clearBatchResults = useCallback(() => {
    setBatchResults([]);
  }, []);

  return {
    enrichBatch: enrichBatch.mutateAsync,
    isEnrichingBatch: enrichBatch.isPending,
    batchResults,
    clearBatchResults,
    batchError: enrichBatch.error
  };
}


