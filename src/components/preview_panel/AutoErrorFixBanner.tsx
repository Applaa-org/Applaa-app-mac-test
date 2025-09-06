import React from 'react';
import { AlertTriangle, Wrench, X, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAutoErrorFix } from '@/hooks/useAutoErrorFix';

interface AutoErrorFixBannerProps {
  onDismiss?: () => void;
}

export function AutoErrorFixBanner({ onDismiss }: AutoErrorFixBannerProps) {
  const { 
    detectedErrors, 
    autoFixCount, 
    isAutoFixing, 
    fixAllErrors, 
    canAutoFix 
  } = useAutoErrorFix();

  // Only show if there are unfixed errors
  const unfixedErrors = detectedErrors.filter(error => !error.autoFixed);
  if (unfixedErrors.length === 0) return null;

  const errorsByCategory = unfixedErrors.reduce((acc, error) => {
    if (!acc[error.category]) acc[error.category] = 0;
    acc[error.category]++;
    return acc;
  }, {} as Record<string, number>);

  const criticalErrors = unfixedErrors.filter(error => error.severity === 'error');
  const warnings = unfixedErrors.filter(error => error.severity === 'warning');

  return (
    <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Auto-Fix Available
              </h3>
              {isAutoFixing && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Fixing...
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Detected {criticalErrors.length} error{criticalErrors.length !== 1 ? 's' : ''}
              {warnings.length > 0 && ` and ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
              {' '}that can be automatically fixed.
            </p>

            {/* Error categories */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(errorsByCategory).map(([category, count]) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}: {count}
                </Badge>
              ))}
            </div>

            {/* Recent errors preview */}
            <div className="space-y-1 mb-3">
              {unfixedErrors.slice(0, 3).map((error, index) => (
                <div key={error.id} className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                  <span className="font-semibold">{error.source.toUpperCase()}:</span> {error.message.slice(0, 100)}
                  {error.message.length > 100 && '...'}
                </div>
              ))}
              {unfixedErrors.length > 3 && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  +{unfixedErrors.length - 3} more errors...
                </div>
              )}
            </div>

            {/* Auto-fix status */}
            <div className="text-xs text-red-600 dark:text-red-400 mb-3">
              Auto-fix attempts: {autoFixCount}/5
              {!canAutoFix && autoFixCount >= 5 && (
                <span className="ml-2 text-orange-600 dark:text-orange-400">
                  (Limit reached - manual fix required)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canAutoFix && (
            <Button
              size="sm"
              onClick={fixAllErrors}
              disabled={isAutoFixing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isAutoFixing ? (
                <>
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Auto-Fix All
                </>
              )}
            </Button>
          )}
          
          {!canAutoFix && (
            <Button
              size="sm"
              variant="outline"
              onClick={fixAllErrors}
              disabled={isAutoFixing}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Manual Fix
            </Button>
          )}

          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

