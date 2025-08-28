import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Sparkles, FileText, Check, X, Info, Zap } from 'lucide-react';
import { useSemanticSuggestions, useRecordSemanticFeedback, SmartSuggestion } from '../../hooks/useSemanticContext';
import { cn } from '../../lib/utils';

interface SmartSuggestionsProps {
  query: string;
  appId: number;
  selectedPaths: string[];
  onAddPath: (path: string) => void;
  onRemovePath: (path: string) => void;
  className?: string;
  maxSuggestions?: number;
  includeOtherApps?: boolean;
}

export function SmartSuggestions({
  query,
  appId,
  selectedPaths,
  onAddPath,
  onRemovePath,
  className,
  maxSuggestions = 5,
  includeOtherApps = false
}: SmartSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading, error } = useSemanticSuggestions({
    query,
    appId,
    maxSuggestions,
    includeOtherApps,
    excludePaths: selectedPaths // Don't suggest already selected files
  }, query.length > 10); // Only search for meaningful queries

  const recordFeedback = useRecordSemanticFeedback();

  const handleAcceptSuggestion = async (suggestion: SmartSuggestion) => {
    onAddPath(suggestion.filePath);
    
    // Record positive feedback
    await recordFeedback.mutateAsync({
      filePath: suggestion.filePath,
      appId,
      query,
      accepted: true
    });

    setFeedbackGiven(prev => new Set([...prev, suggestion.filePath]));
  };

  const handleRejectSuggestion = async (suggestion: SmartSuggestion) => {
    // Record negative feedback
    await recordFeedback.mutateAsync({
      filePath: suggestion.filePath,
      appId,
      query,
      accepted: false
    });

    setFeedbackGiven(prev => new Set([...prev, suggestion.filePath]));
  };

  const isSelected = (filePath: string) => selectedPaths.includes(filePath);
  const hasGivenFeedback = (filePath: string) => feedbackGiven.has(filePath);

  // Reset feedback state when query changes
  useEffect(() => {
    setFeedbackGiven(new Set());
    setExpandedSuggestion(null);
  }, [query]);

  if (!query || query.length <= 10) {
    return null;
  }

  if (error) {
    return (
      <Card className={cn("border-amber-200 bg-amber-50", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Info className="h-4 w-4" />
            <div className="flex-1">
              <span className="text-sm font-medium">Smart suggestions unavailable</span>
              <p className="text-xs text-amber-600 mt-1">
                Semantic context features require additional setup. Check Settings for more information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("border-blue-200 bg-blue-50", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Finding relevant files...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className={cn("border-gray-200 bg-gray-50", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="text-sm">No smart suggestions found for this query</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-green-200 bg-green-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-800">
          <Sparkles className="h-4 w-4" />
          Smart Suggestions
          <Badge variant="secondary" className="ml-auto text-xs">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.filePath}
            suggestion={suggestion}
            isSelected={isSelected(suggestion.filePath)}
            isExpanded={expandedSuggestion === suggestion.filePath}
            hasGivenFeedback={hasGivenFeedback(suggestion.filePath)}
            onAccept={() => handleAcceptSuggestion(suggestion)}
            onReject={() => handleRejectSuggestion(suggestion)}
            onToggleExpand={() => 
              setExpandedSuggestion(
                expandedSuggestion === suggestion.filePath ? null : suggestion.filePath
              )
            }
          />
        ))}
        
        {includeOtherApps && (
          <div className="pt-2 border-t border-green-200">
            <p className="text-xs text-green-700 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Including cross-app suggestions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SuggestionItemProps {
  suggestion: SmartSuggestion;
  isSelected: boolean;
  isExpanded: boolean;
  hasGivenFeedback: boolean;
  onAccept: () => void;
  onReject: () => void;
  onToggleExpand: () => void;
}

function SuggestionItem({
  suggestion,
  isSelected,
  isExpanded,
  hasGivenFeedback,
  onAccept,
  onReject,
  onToggleExpand
}: SuggestionItemProps) {
  const similarityPercent = Math.round(suggestion.similarity * 100);
  
  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all",
      isSelected 
        ? "border-green-400 bg-green-100" 
        : "border-green-200 bg-white hover:border-green-300"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleExpand}
                    className="text-sm font-medium text-gray-900 hover:text-green-700 truncate text-left"
                  >
                    {suggestion.filePath}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to {isExpanded ? 'collapse' : 'expand'} details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Badge variant="outline" className="text-xs">
              {suggestion.language}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
            <span>{similarityPercent}% match</span>
            <span>•</span>
            <span>{suggestion.reason}</span>
            {suggestion.tokens > 0 && (
              <>
                <span>•</span>
                <span>{suggestion.tokens} tokens</span>
              </>
            )}
          </div>

          {isExpanded && (
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
              <p className="font-medium mb-1">Summary:</p>
              <p>{suggestion.summary}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isSelected ? (
            <Badge variant="default" className="text-xs bg-green-600">
              Selected
            </Badge>
          ) : hasGivenFeedback ? (
            <Badge variant="secondary" className="text-xs">
              Rated
            </Badge>
          ) : (
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-green-200"
                      onClick={onAccept}
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to context</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-red-200"
                      onClick={onReject}
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Not relevant</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
