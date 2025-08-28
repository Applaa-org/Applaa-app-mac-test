import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Something went wrong
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm max-w-md mx-auto">
              This component encountered an error, but the rest of the app is still working.
            </p>
            {this.state.error && (
              <details className="text-left text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-3 rounded">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
              </details>
            )}
            <Button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}