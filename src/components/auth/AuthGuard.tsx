import React, { useEffect, useState } from 'react';
import { useWordPressAuth } from '../../hooks/useWordPressAuth';
import { WordPressAuthDialog } from './WordPressAuthDialog';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading, configStatus } = useWordPressAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    // If not loading and not authenticated, show auth dialog
    if (!isLoading && !isAuthenticated) {
      setShowAuthDialog(true);
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show configuration error if WordPress is not configured
  if (!configStatus?.isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Applaa authentication is not configured. Please set WORDPRESS_URL in your .env file.
            </AlertDescription>
          </Alert>
          {fallback}
        </div>
      </div>
    );
  }

  // Show auth dialog if not authenticated - but keep the app layout in background
  if (!isAuthenticated) {
    return (
      <>
        {/* Show the app layout in background (blurred/disabled) */}
        <div className="blur-[1px] pointer-events-none opacity-70">
          {children}
        </div>
        
        {/* Auth dialog popup */}
        <WordPressAuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog} 
        />
      </>
    );
  }

  // User is authenticated, show the app
  return <>{children}</>;
};
