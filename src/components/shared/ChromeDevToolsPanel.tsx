import React, { useState } from 'react';
import { Terminal, Network, AlertTriangle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalChromeDevTools } from './ChromeDevToolsProvider';

interface ChromeDevToolsPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function ChromeDevToolsPanel({ 
  className = '',
  defaultExpanded = false 
}: ChromeDevToolsPanelProps) {
  const devTools = useOptionalChromeDevTools();
  const [activeTab, setActiveTab] = useState<'console' | 'network' | 'errors'>('console');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // If DevTools not available, don't render anything
  if (!devTools) {
    return null;
  }

  const {
    isConnected,
    consoleMessages,
    networkRequests,
    errors,
    isStarting,
    hasErrors,
    hasNetworkIssues,
    totalMessages,
    totalRequests,
    clearMessages
  } = devTools;

  const getMessageIcon = (level?: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-3 h-3 text-blue-500" />;
      default: return <Terminal className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-yellow-600';
    if (status >= 400) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isConnected && !isStarting) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-4 text-center">
          <Terminal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chrome DevTools not connected
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Connect to see console messages and network requests
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            DevTools {isConnected ? 'Connected' : 'Connecting...'}
          </span>

          {/* Stats */}
          {isConnected && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{totalMessages} messages</span>
              <span>{totalRequests} requests</span>
              {hasErrors && (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.length} errors
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={!isConnected}
            className="text-xs"
          >
            Clear
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'console' as const, label: 'Console', icon: Terminal, count: totalMessages },
          { id: 'network' as const, label: 'Network', icon: Network, count: totalRequests },
          { id: 'errors' as const, label: 'Errors', icon: AlertTriangle, count: errors.length }
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                id === 'errors' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`${isExpanded ? 'h-96' : 'h-48'} overflow-y-auto`}>
        {activeTab === 'console' && (
          <div className="p-2 space-y-1">
            {consoleMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No console messages yet</p>
              </div>
            ) : (
              consoleMessages.map((message, index) => (
                <div key={index} className="flex items-start gap-2 p-2 text-xs font-mono hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  {getMessageIcon(message.level)}
                  <span className="text-gray-500 flex-shrink-0">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <span className={`flex-1 ${
                    message.level === 'error' ? 'text-red-600' :
                    message.level === 'warn' ? 'text-yellow-600' :
                    message.level === 'info' ? 'text-blue-600' :
                    'text-gray-900 dark:text-gray-100'
                  }`}>
                    {message.message}
                  </span>
                  {message.url && (
                    <span className="text-gray-400 text-xs truncate max-w-32">
                      {new URL(message.url).pathname}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="p-2 space-y-1">
            {networkRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No network requests yet</p>
              </div>
            ) : (
              networkRequests.map((request, index) => (
                <div key={index} className="flex items-center gap-3 p-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    request.method === 'GET' ? 'bg-blue-100 text-blue-600' :
                    request.method === 'POST' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {request.method}
                  </span>
                  <span className={`font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                  <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                    {new URL(request.url).pathname}
                  </span>
                  <span className="text-gray-500">
                    {formatSize(request.size)}
                  </span>
                  <span className="text-gray-400">
                    {request.responseTime}ms
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="p-2 space-y-1">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No errors detected</p>
              </div>
            ) : (
              errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        {error.message}
                      </p>
                      {error.url && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {error.url}
                        </p>
                      )}
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="text-xs text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
