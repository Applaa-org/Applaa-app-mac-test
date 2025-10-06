import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench, Download, AlertCircle, Info } from 'lucide-react';
import { useAppRepair } from '@/hooks/useAppRepair';

interface AppRepairPanelProps {
  appPath: string;
  onRepairComplete?: (success: boolean) => void;
  className?: string;
}

export const AppRepairPanel: React.FC<AppRepairPanelProps> = ({
  appPath,
  onRepairComplete,
  className = ""
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    repairResult,
    repairCheck,
    isChecking,
    needsRepair,
    hasIssues,
    hasWarnings,
    missingDependencies,
    outdatedDependencies,
    repairApp,
    isRepairing,
    repairError,
    resetResult,
    refetchCheck
  } = useAppRepair(appPath);

  const handleRepair = async () => {
    try {
      resetResult();
      const result = await repairApp();
      onRepairComplete?.(result.success);
    } catch (error) {
      console.error('Repair failed:', error);
      onRepairComplete?.(false);
    }
  };

  const handleRefresh = () => {
    resetResult();
    refetchCheck();
  };

  if (isChecking) {
    return (
      <div className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 ${className}`}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Checking App Health</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Analyzing dependencies and configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (repairError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-100">Repair Check Failed</h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {repairError instanceof Error ? repairError.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show repair result if available
  if (repairResult) {
    const isSuccess = repairResult.success;
    
    return (
      <div className={`rounded-lg p-4 border ${
        isSuccess 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      } ${className}`}>
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <div className="flex-1">
            <h3 className={`font-medium ${
              isSuccess 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-red-900 dark:text-red-100'
            }`}>
              {isSuccess ? 'App Repair Completed' : 'App Repair Failed'}
            </h3>
            
            {isSuccess && repairResult.fixes.length > 0 && (
              <p className="text-sm text-green-700 dark:text-green-300">
                Fixed {repairResult.fixes.length} issue{repairResult.fixes.length !== 1 ? 's' : ''}
              </p>
            )}
            
            {!isSuccess && repairResult.issues.length > 0 && (
              <p className="text-sm text-red-700 dark:text-red-300">
                {repairResult.issues.length} issue{repairResult.issues.length !== 1 ? 's' : ''} remain
              </p>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3">
            {repairResult.fixes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Fixes Applied:</h4>
                <ul className="space-y-1">
                  {repairResult.fixes.map((fix, index) => (
                    <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {repairResult.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings:</h4>
                <ul className="space-y-1">
                  {repairResult.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {repairResult.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Remaining Issues:</h4>
                <ul className="space-y-1">
                  {repairResult.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-200 rounded transition-colors"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // Show repair needed state
  if (needsRepair) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100">App Needs Repair</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This app has dependency issues that may prevent the preview from working.
            </p>
            
            {(missingDependencies.length > 0 || outdatedDependencies.length > 0) && (
              <div className="mt-2">
                {missingDependencies.length > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Missing: {missingDependencies.join(', ')}
                  </p>
                )}
                {outdatedDependencies.length > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Outdated: {outdatedDependencies.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleRepair}
            disabled={isRepairing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white rounded transition-colors"
          >
            {isRepairing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            {isRepairing ? 'Repairing...' : 'Repair App'}
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 rounded transition-colors"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3">
            {hasIssues && (
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Issues Found:</h4>
                <ul className="space-y-1">
                  {repairCheck?.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasWarnings && (
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings:</h4>
                <ul className="space-y-1">
                  {repairCheck?.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // App is healthy
  return (
    <div className={`bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 ${className}`}>
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <div>
          <h3 className="font-medium text-green-900 dark:text-green-100">App is Healthy</h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            All dependencies are up to date and the app should work properly.
          </p>
        </div>
      </div>
      
      <div className="mt-3">
        <button
          onClick={handleRefresh}
          className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-800 dark:text-green-200 rounded transition-colors"
        >
          Check Again
        </button>
      </div>
    </div>
  );
};
