import React, { useState, useEffect, useCallback } from 'react';
import { PreviewWithDevTools } from '@/components/shared/PreviewWithDevTools';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { PreviewType, getPreviewSystem } from '@/types/preview';

interface WebappPreviewProps {
  appId: number;
  previewType: PreviewType;
  className?: string;
}

export function WebappPreview({ 
  appId, 
  previewType, 
  className = '' 
}: WebappPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');

  const previewSystem = getPreviewSystem(previewType);

  const startPreview = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError('');
      setStatus('starting');

      // Simulate starting the preview server
      // In real implementation, this would call the appropriate IPC handler
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock URL generation
      const mockUrl = `http://localhost:${previewSystem.defaultPort}`;
      setPreviewUrl(mockUrl);
      setStatus('running');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start preview');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, previewSystem.defaultPort]);

  const stopPreview = useCallback(() => {
    setPreviewUrl('');
    setStatus('idle');
    setError('');
  }, []);

  const refreshPreview = useCallback(() => {
    if (previewUrl) {
      // Force iframe refresh
      const iframe = document.querySelector('iframe');
      if (iframe) {
        iframe.src = iframe.src;
      }
    }
  }, [previewUrl]);

  // Auto-start if configured
  useEffect(() => {
    if (previewSystem.autoStart && status === 'idle') {
      startPreview();
    }
  }, [previewSystem.autoStart, status, startPreview]);

  return (
    <PreviewWithDevTools
      previewUrl={previewUrl}
      devToolsEnabled={previewSystem.devToolsSupported}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className={`w-2 h-2 rounded-full ${
              status === 'running' ? 'bg-green-500' : 
              status === 'error' ? 'bg-red-500' : 
              'bg-gray-400'
            }`} />
            
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {previewSystem.name}
            </span>

            {/* Status Text */}
            {status === 'running' && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Running on port {previewSystem.defaultPort}</span>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Preview failed</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPreview}
              disabled={!previewUrl}
              className="h-8 px-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            {previewUrl && (
              <Button
                variant="default"
                size="sm"
                onClick={() => window.open(previewUrl, '_blank')}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <ExternalLink className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {previewSystem.name} Preview
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {previewSystem.description}
                </p>
                <Button
                  onClick={startPreview}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Preview'
                  )}
                </Button>
              </div>
            </div>
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Starting {previewSystem.name}...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md p-8">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Preview Failed
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {error || 'An unknown error occurred'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={startPreview}
                    variant="outline"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={stopPreview}
                    variant="default"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === 'running' && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title={`${previewSystem.name} Preview`}
            />
          )}
        </div>
      </div>
    </PreviewWithDevTools>
  );
}
