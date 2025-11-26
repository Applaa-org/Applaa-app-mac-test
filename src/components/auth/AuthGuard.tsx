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
  const { isAuthenticated, isLoading } = useWordPressAuth();
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

  // No configuration check needed for API-based authentication
  // Authentication is always available via API

  // Show auth dialog if not authenticated - but allow closing it
  if (!isAuthenticated) {
    return (
      <>
        {/* Show the app layout - only blur/disable when dialog is open */}
        <div className={showAuthDialog ? "blur-[1px] pointer-events-none opacity-70" : ""}>
          {children}
        </div>
        
        {/* Auth dialog popup - can be closed */}
        {showAuthDialog && (
          <WordPressAuthDialog 
            open={showAuthDialog} 
            onOpenChange={(open) => {
              setShowAuthDialog(open);
              // If dialog is closed, allow user to continue (they can reopen it later)
            }} 
          />
        )}
      </>
    );
  }

  // User is authenticated, show the app
  return <>{children}</>;
};
