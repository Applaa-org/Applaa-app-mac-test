/**
 * Prompt Enrichment Viewer Component
 * 
 * A comprehensive UI component for visualizing and managing prompt enrichment.
 * Shows before/after comparison, enrichment settings, and analytics.
 */

import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Settings, BarChart3, Copy, Download, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { usePromptEnrichment, useEnrichmentConfig, useSpecValidation } from '@/hooks/mobile/usePromptEnrichment';
import { specToSummary } from '@/lib/mobile/generation-spec-utils';
import type { EnrichmentResult } from '@/hooks/mobile/usePromptEnrichment';
import type { GenerationSpec } from '@/lib/mobile/types';

/**
 * Props for the PromptEnrichmentViewer component
 */
interface PromptEnrichmentViewerProps {
  /** The enrichment result to display */
  enrichmentResult: EnrichmentResult | null;
  
  /** The original user prompt */
  userPrompt: string;
  
  /** The generation spec used */
  spec: GenerationSpec;
  
  /** Whether to show advanced settings */
  showAdvancedSettings?: boolean;
  
  /** Function called when enrichment is triggered */
  onEnrich?: (userPrompt: string, spec: GenerationSpec) => void;
  
  /** Whether the viewer is in compact mode */
  compact?: boolean;
}

/**
 * Main PromptEnrichmentViewer component
 */
export function PromptEnrichmentViewer({
  enrichmentResult,
  userPrompt,
  spec,
  showAdvancedSettings = true,
  onEnrich,
  compact = false
}: PromptEnrichmentViewerProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings' | 'analytics'>('preview');
  const [showRawPrompt, setShowRawPrompt] = useState(false);
  
  const { config, updateConfig, presets, applyPreset } = useEnrichmentConfig();
  const { data: validation } = useSpecValidation(spec);

  // Calculate enrichment metrics
  const metrics = useMemo(() => {
    if (!enrichmentResult) return null;

    const originalLength = enrichmentResult.originalPrompt.length;
    const enrichedLength = enrichmentResult.length;
    const enrichmentRatio = enrichedLength / originalLength;

    return {
      originalLength,
      enrichedLength,
      enrichmentRatio: Math.round(enrichmentRatio * 100) / 100,
      sectionsAdded: enrichmentResult.includedSections.length,
      wasTruncated: enrichmentResult.wasTruncated
    };
  }, [enrichmentResult]);

  // Copy prompt to clipboard
  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  // Download prompt as file
  const downloadPrompt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prompt Enrichment</h3>
          <p className="text-sm text-gray-600">
            Enhanced prompts for better code generation
          </p>
        </div>
        
        {onEnrich && (
          <Button
            onClick={() => onEnrich(userPrompt, spec)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Enrich Prompt
          </Button>
        )}
      </div>

      {/* Validation Alerts */}
      {validation && !validation.valid && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium text-red-800">Specification Issues:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {validation.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{metrics.enrichmentRatio}x</div>
              <p className="text-xs text-gray-600">Enrichment Ratio</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{metrics.sectionsAdded}</div>
              <p className="text-xs text-gray-600">Sections Added</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(metrics.enrichedLength / 1000 * 10) / 10}k
              </div>
              <p className="text-xs text-gray-600">Total Length</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-1">
                {metrics.wasTruncated ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">Truncated</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Complete</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-600">Status</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          {showAdvancedSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Prompt */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Original Prompt</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyPrompt(userPrompt)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>
                  {userPrompt.length} characters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {userPrompt}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Enriched Prompt */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Enriched Prompt</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRawPrompt(!showRawPrompt)}
                    >
                      {showRawPrompt ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    {enrichmentResult && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPrompt(enrichmentResult.prompt)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPrompt(enrichmentResult.prompt, 'enriched-prompt.txt')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {enrichmentResult ? `${enrichmentResult.length} characters` : 'No enrichment yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enrichmentResult ? (
                  <div className="bg-blue-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {showRawPrompt ? (
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {enrichmentResult.prompt}
                      </pre>
                    ) : (
                      <div className="space-y-3">
                        {enrichmentResult.includedSections.map((section, index) => (
                          <Badge key={index} variant="outline" className="mr-1">
                            {section}
                          </Badge>
                        ))}
                        <Separator />
                        <p className="text-sm text-gray-700">
                          Preview: {enrichmentResult.prompt.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No enriched prompt available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generation Spec Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation Specification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-3">
                <pre className="text-sm whitespace-pre-wrap">
                  {specToSummary(spec)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        {showAdvancedSettings && (
          <TabsContent value="settings" className="space-y-4">
            <EnrichmentSettings
              config={config}
              onConfigChange={updateConfig}
              presets={presets}
              onApplyPreset={applyPreset}
            />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <EnrichmentAnalytics
            enrichmentResult={enrichmentResult}
            validation={validation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Enrichment Settings Component
 */
interface EnrichmentSettingsProps {
  config: any;
  onConfigChange: (updates: any) => void;
  presets: any;
  onApplyPreset: (preset: string) => void;
}

function EnrichmentSettings({
  config,
  onConfigChange,
  presets,
  onApplyPreset
}: EnrichmentSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Presets</CardTitle>
          <CardDescription>
            Quick configurations for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(presets).map((preset) => (
              <Button
                key={preset}
                variant="outline"
                onClick={() => onApplyPreset(preset)}
                className="capitalize"
              >
                {preset}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrichment Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Platform Guidance</label>
              <Switch
                checked={config.includePlatformGuidance}
                onCheckedChange={(checked) => 
                  onConfigChange({ includePlatformGuidance: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Framework Best Practices</label>
              <Switch
                checked={config.includeFrameworkBestPractices}
                onCheckedChange={(checked) => 
                  onConfigChange({ includeFrameworkBestPractices: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Template Patterns</label>
              <Switch
                checked={config.includeTemplatePatterns}
                onCheckedChange={(checked) => 
                  onConfigChange({ includeTemplatePatterns: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Dependency Guidance</label>
              <Switch
                checked={config.includeDependencyGuidance}
                onCheckedChange={(checked) => 
                  onConfigChange({ includeDependencyGuidance: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Architecture Guidance</label>
              <Switch
                checked={config.includeArchitectureGuidance}
                onCheckedChange={(checked) => 
                  onConfigChange({ includeArchitectureGuidance: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Prompt Length</label>
            <Slider
              value={[config.maxPromptLength]}
              onValueChange={([value]) => onConfigChange({ maxPromptLength: value })}
              max={20000}
              min={2000}
              step={1000}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {config.maxPromptLength.toLocaleString()} characters
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Enrichment Analytics Component
 */
interface EnrichmentAnalyticsProps {
  enrichmentResult: EnrichmentResult | null;
  validation: any;
}

function EnrichmentAnalytics({ enrichmentResult, validation }: EnrichmentAnalyticsProps) {
  if (!enrichmentResult) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics available yet</p>
        <p className="text-sm text-gray-400">Enrich a prompt to see detailed analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Complexity Analysis */}
      {enrichmentResult.complexity && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complexity Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Complexity Level</span>
                <Badge variant={
                  enrichmentResult.complexity.level === 'Simple' ? 'default' :
                  enrichmentResult.complexity.level === 'Moderate' ? 'secondary' :
                  enrichmentResult.complexity.level === 'Complex' ? 'destructive' : 'destructive'
                }>
                  {enrichmentResult.complexity.level}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Complexity Score</span>
                <span className="font-mono">{enrichmentResult.complexity.score}/10</span>
              </div>
              <Progress value={enrichmentResult.complexity.score * 10} className="w-full" />
              
              {enrichmentResult.complexity.factors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Contributing Factors:</p>
                  <div className="space-y-1">
                    {enrichmentResult.complexity.factors.map((factor, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center">
                        <Info className="h-3 w-3 mr-2" />
                        {factor}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrichment Analytics */}
      {enrichmentResult.analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrichment Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Enrichment Ratio</p>
                <p className="font-mono text-lg">{enrichmentResult.analytics.enrichmentRatio.toFixed(1)}x</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guidance Ratio</p>
                <p className="font-mono text-lg">{(enrichmentResult.analytics.guidanceRatio * 100).toFixed(1)}%</p>
              </div>
            </div>
            
            {enrichmentResult.analytics.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <div className="space-y-1">
                  {enrichmentResult.analytics.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specification Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className={validation.valid ? 'text-green-600' : 'text-red-600'}>
                  {validation.valid ? 'Valid specification' : 'Issues found'}
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                    {validation.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Warnings:</p>
                  <ul className="text-sm text-yellow-600 list-disc list-inside space-y-1">
                    {validation.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Suggestions:</p>
                  <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                    {validation.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


