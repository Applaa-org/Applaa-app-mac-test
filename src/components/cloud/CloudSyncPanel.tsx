import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '../../atoms/appAtoms';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useR2Storage, useAppR2Storage, formatFileSize, getRelativeTime } from '../../hooks/useR2Storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { AuthDialog } from '../auth/AuthDialog';
import { 
  Cloud, 
  CloudOff, 
  Upload, 
  Download, 
  Sync, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  HardDrive,
  Settings,
  Shield,
  Zap
} from 'lucide-react';

export const CloudSyncPanel: React.FC = () => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { isAuthenticated, user, isLoading: isAuthLoading } = useSupabaseAuth();
  const { 
    isInitialized: isR2Initialized, 
    connectionStatus, 
    testConnection,
    syncApp,
    restoreApp,
    isSyncingApp,
    isRestoringApp 
  } = useR2Storage();
  
  const {
    syncStatus,
    hasRemoteFiles,
    fileCount,
    totalSize,
    lastSync,
    isLoadingSyncStatus,
    refetchSyncStatus
  } = useAppR2Storage(selectedAppId);

  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  // Handle sync app
  const handleSyncApp = async () => {
    if (!selectedAppId) return;

    try {
      setSyncProgress(0);
      const result = await syncApp({ 
        appId: selectedAppId,
        dryRun: false 
      });
      
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(null), 2000);
      refetchSyncStatus();
    } catch (error) {
      setSyncProgress(null);
    }
  };

  // Handle restore app
  const handleRestoreApp = async () => {
    if (!selectedAppId) return;

    try {
      // This would typically open a dialog to select target path
      const targetPath = `./restored-app-${selectedAppId}`;
      await restoreApp({ 
        appId: selectedAppId, 
        targetPath 
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle test connection
  const handleTestConnection = async () => {
    await testConnection();
  };

  if (!selectedAppId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CloudOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Select an app to manage cloud sync</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Authentication Status
              </CardTitle>
              <CardDescription>
                Sign in to enable cloud sync and backup features
              </CardDescription>
            </div>
            {!isAuthenticated && (
              <Button onClick={() => setShowAuthDialog(true)}>
                Sign In
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAuthLoading ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking authentication...</span>
            </div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">{user.fullName || user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {user.subscriptionTier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium">Not signed in</p>
                <p className="text-sm text-muted-foreground">
                  Sign in to access cloud features
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cloud Storage Status */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Cloud Storage
                </CardTitle>
                <CardDescription>
                  Sync your app files to secure cloud storage
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Test Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              {connectionStatus?.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Connected to cloud storage</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium">
                    {connectionStatus?.error || 'Not connected'}
                  </span>
                </>
              )}
            </div>

            <Separator />

            {/* Sync Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">App Sync Status</h4>
                {isLoadingSyncStatus && (
                  <Clock className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {syncStatus ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Files in Cloud</span>
                    </div>
                    <p className="text-2xl font-bold">{fileCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(totalSize)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Last Sync</span>
                    </div>
                    <p className="text-sm">
                      {lastSync ? getRelativeTime(lastSync) : 'Never'}
                    </p>
                    <Badge variant={hasRemoteFiles ? 'default' : 'secondary'}>
                      {hasRemoteFiles ? 'Synced' : 'Not Synced'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to load sync status. Check your connection and try again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Sync Progress */}
              {syncProgress !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Syncing...</span>
                    <span className="text-sm text-muted-foreground">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSyncApp}
                  disabled={isSyncingApp || !connectionStatus?.success}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isSyncingApp ? 'Syncing...' : 'Sync to Cloud'}
                </Button>

                {hasRemoteFiles && (
                  <Button
                    variant="outline"
                    onClick={handleRestoreApp}
                    disabled={isRestoringApp || !connectionStatus?.success}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isRestoringApp ? 'Restoring...' : 'Restore from Cloud'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Cloud Features</CardTitle>
          <CardDescription>
            What you get with Applaa Cloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Sync className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Automatic Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Keep your apps synchronized across all devices
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Secure Backup</h4>
                <p className="text-sm text-muted-foreground">
                  Your code is encrypted and safely stored in the cloud
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Version History</h4>
                <p className="text-sm text-muted-foreground">
                  Access previous versions of your apps anytime
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Fast Restore</h4>
                <p className="text-sm text-muted-foreground">
                  Quickly restore your apps on any device
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auth Dialog */}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultTab="signin"
      />
    </div>
  );
};

