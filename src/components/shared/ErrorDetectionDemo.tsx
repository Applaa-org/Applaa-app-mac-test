import React, { useState, useEffect } from 'react';
import { errorDetector, ErrorAnalysis } from '../../services/error-detector';
import { DevToolsMessage } from '../../hooks/useChromeDevTools';

interface ErrorDetectionDemoProps {
  className?: string;
}

export function ErrorDetectionDemo({ className }: ErrorDetectionDemoProps) {
  const [detectedErrors, setDetectedErrors] = useState<Array<{
    error: DevToolsMessage;
    analysis: ErrorAnalysis;
    report: string;
  }>>([]);

  // Simulate the exact error you encountered
  const simulateHapticsError = () => {
    const hapticsError: DevToolsMessage = {
      type: 'error',
      timestamp: Date.now(),
      level: 'error',
      message: 'UnavailabilityError: The method or property Haptic.impactAsync is not available on web, are you sure you\'ve linked all the native dependencies properly?',
      url: 'http://localhost:8088',
      stack: `at Object.impactAsync (entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:107296:13)
at move (entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:91936:17)
at Object.onHandlerStateChange (entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable:91975:13)`
    };

    const analysis = errorDetector.analyzeError(hapticsError);
    if (analysis) {
      const report = errorDetector.generateErrorReport(hapticsError, analysis);
      
      setDetectedErrors(prev => [...prev, {
        error: hapticsError,
        analysis,
        report
      }]);
    }
  };

  // Simulate other common errors
  const simulateDependencyError = () => {
    const dependencyError: DevToolsMessage = {
      type: 'error',
      timestamp: Date.now(),
      level: 'error',
      message: 'Cannot find module \'expo-haptics\'',
      url: 'http://localhost:8088'
    };

    const analysis = errorDetector.analyzeError(dependencyError);
    if (analysis) {
      const report = errorDetector.generateErrorReport(dependencyError, analysis);
      
      setDetectedErrors(prev => [...prev, {
        error: dependencyError,
        analysis,
        report
      }]);
    }
  };

  const clearErrors = () => {
    setDetectedErrors([]);
  };

  return (
    <div className={`p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          🚨 Error Detection System Demo
        </h2>
        <button
          onClick={clearErrors}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This demonstrates how our enhanced system automatically detects and analyzes console errors,
          then generates detailed reports for the chat stream.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={simulateHapticsError}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            📳 Simulate Haptics Error
          </button>
          <button
            onClick={simulateDependencyError}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            📦 Simulate Dependency Error
          </button>
        </div>
      </div>

      {detectedErrors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p>No errors detected yet. Click the buttons above to simulate common errors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {detectedErrors.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {item.analysis.type === 'haptics' ? '📳' : 
                     item.analysis.type === 'dependency' ? '📦' : '❓'}
                  </span>
                  <span className="font-semibold text-lg">
                    {item.analysis.type.toUpperCase()} ERROR
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    item.analysis.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    item.analysis.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    item.analysis.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.analysis.severity.toUpperCase()}
                  </span>
                  {item.analysis.autoFixable && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                      🔧 Auto-Fixable
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-1">Error Message:</h4>
                <code className="text-sm bg-red-50 text-red-700 p-2 rounded block">
                  {item.error.message}
                </code>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-1">Analysis:</h4>
                <p className="text-gray-700">{item.analysis.message}</p>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-gray-900 mb-1">Suggested Fix:</h4>
                <p className="text-gray-700">{item.analysis.suggestion}</p>
              </div>

              {item.analysis.codeExample && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">Code Example:</h4>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    <code>{item.analysis.codeExample}</code>
                  </pre>
                </div>
              )}

              <div className="border-t pt-3">
                <h4 className="font-medium text-gray-900 mb-2">Generated Chat Report:</h4>
                <div className="bg-blue-50 p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap">{item.report}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🎯 How This Works:</h3>
        <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
          <li>Chrome DevTools MCP captures console errors in real-time</li>
          <li>ErrorDetector analyzes each error and categorizes it</li>
          <li>System generates detailed reports with fix suggestions</li>
          <li>Reports are automatically sent to the chat stream</li>
          <li>Auto-fixable errors trigger the Problems Tab</li>
          <li>Users get instant feedback without manual copy-pasting</li>
        </ol>
      </div>
    </div>
  );
}
