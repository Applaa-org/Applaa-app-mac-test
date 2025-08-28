import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { IpcClient } from '../../ipc/ipc_client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { formatFileSize, getRelativeTime } from '../../hooks/useR2Storage';
import { toast } from 'sonner';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Settings, 
  Clock, 
  HardDrive,
  Shield,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Info
} from 'lucide-react';

interface BackupMetadata {
  id: string;
  userId: string;
  backupPath: string;
  backupSize: number;
  createdAt: Date;
  isCompressed: boolean;
}

interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBackups: number;
  compressionEnabled: boolean;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup: Date | null;
  nextBackup: Date | null;
}

interface BackupStatus {
  isInProgress: boolean;
  lastBackupTime: Date | null;
  config: BackupConfig;
}

export const BackupManager: React.FC = () => {
  const { isAuthenticated, user } = useSupabaseAuth();
  
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [config, setConfig] = useState<BackupConfig>({
    enabled: false,
    intervalMinutes: 60,
    maxBackups: 24,
    compressionEnabled: true,
  });
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isDeletingBackup, setIsDeletingBackup] = useState<string | null>(null);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  // Load backup data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadBackupData();
      // Set up periodic refresh
      const interval = setInterval(loadBackupData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadBackupData = async () => {
    try {
      setIsLoading(true);
      
      // Initialize backup system
      await IpcClient.getInstance().backupInitializeFromSettings({ userId: user?.id });
      
      // Load backups, config, stats, and status in parallel
      const [backupsResult, configResult, statsResult, statusResult] = await Promise.all([
        IpcClient.getInstance().backupList(),
        IpcClient.getInstance().backupGetConfig(),
        IpcClient.getInstance().backupGetStats(),
        IpcClient.getInstance().backupGetStatus(),
      ]);

      if (backupsResult.success && backupsResult.backups) {
        setBackups(backupsResult.backups);
      }

      if (configResult.success && configResult.config) {
        setConfig(configResult.config);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }

      if (statusResult.success && statusResult.status) {
        setStatus(statusResult.status);
      }
    } catch (error) {
      console.error('Failed to load backup data:', error);
      toast.error('Failed to load backup information');
    } finally {
      setIsLoading(false);
    }
  };

  // Create manual backup
  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const result = await IpcClient.getInstance().backupCreate();
      
      if (result.success) {
        toast.success(`Backup created successfully (${formatFileSize(result.size || 0)})`);
        await loadBackupData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore backup
  const restoreBackup = async (backupId: string) => {
    try {
      setIsRestoringBackup(true);
      const result = await IpcClient.getInstance().backupRestore({ backupId });
      
      if (result.success) {
        toast.success(`Backup restored to: ${result.restoredPath}`);
      } else {
        toast.error(result.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast.error('Failed to restore backup');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Delete backup
  const deleteBackup = async (backupId: string) => {
    try {
      setIsDeletingBackup(backupId);
      const result = await IpcClient.getInstance().backupDelete({ backupId });
      
      if (result.success) {
        toast.success('Backup deleted successfully');
        await loadBackupData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to delete backup');
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast.error('Failed to delete backup');
    } finally {
      setIsDeletingBackup(null);
    }
  };

  // Update backup configuration
  const updateConfig = async (newConfig: Partial<BackupConfig>) => {
    try {
      setIsUpdatingConfig(true);
      const result = await IpcClient.getInstance().backupUpdateConfig(newConfig);
      
      if (result.success) {
        setConfig(prev => ({ ...prev, ...newConfig }));
        toast.success('Backup settings updated');
        
        // If enabling/disabling automatic backups, start/stop them
        if ('enabled' in newConfig) {
          if (newConfig.enabled) {
            await IpcClient.getInstance().backupStartAutomatic(config);
          } else {
            await IpcClient.getInstance().backupStopAutomatic();
          }
        }
        
        await loadBackupData(); // Refresh status
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      toast.error('Failed to update backup settings');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to access backup features</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading backup information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backup Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Backup
          </CardTitle>
          <CardDescription>
            Automatically backup your Applaa database to secure cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            {status?.isInProgress ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="font-medium">Backup in progress...</span>
              </>
            ) : config.enabled ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Automatic backups enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Automatic backups disabled</span>
              </>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalBackups}</div>
                <div className="text-sm text-muted-foreground">Total Backups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                <div className="text-sm text-muted-foreground">Storage Used</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {stats.lastBackup ? getRelativeTime(stats.lastBackup) : 'Never'}
                </div>
                <div className="text-sm text-muted-foreground">Last Backup</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  {stats.nextBackup && config.enabled ? getRelativeTime(stats.nextBackup) : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Next Backup</div>
              </div>
            </div>
          )}

          {/* Manual Backup */}
          <div className="flex gap-2">
            <Button
              onClick={createBackup}
              disabled={isCreatingBackup || status?.isInProgress}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isCreatingBackup ? 'Creating...' : 'Create Backup Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Backup Settings
          </CardTitle>
          <CardDescription>
            Configure automatic backup behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Automatic Backups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create backups at regular intervals
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
              disabled={isUpdatingConfig}
            />
          </div>

          <Separator />

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Backup Interval (minutes)</Label>
            <Input
              id="interval"
              type="number"
              min="5"
              max="1440"
              value={config.intervalMinutes}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateConfig({ intervalMinutes: value });
                }
              }}
              disabled={isUpdatingConfig}
            />
            <p className="text-sm text-muted-foreground">
              How often to create automatic backups (5 minutes to 24 hours)
            </p>
          </div>

          {/* Max Backups */}
          <div className="space-y-2">
            <Label htmlFor="maxBackups">Maximum Backups</Label>
            <Input
              id="maxBackups"
              type="number"
              min="1"
              max="100"
              value={config.maxBackups}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  updateConfig({ maxBackups: value });
                }
              }}
              disabled={isUpdatingConfig}
            />
            <p className="text-sm text-muted-foreground">
              Number of backups to keep (older backups are automatically deleted)
            </p>
          </div>

          {/* Compression */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Compression</Label>
              <p className="text-sm text-muted-foreground">
                Compress backups to save storage space (coming soon)
              </p>
            </div>
            <Switch
              checked={config.compressionEnabled}
              onCheckedChange={(compressionEnabled) => updateConfig({ compressionEnabled })}
              disabled={true} // TODO: Implement compression
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Backup History
          </CardTitle>
          <CardDescription>
            View and manage your database backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No backups found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first backup to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">
                        {getRelativeTime(backup.createdAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(backup.backupSize)} • {backup.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {backup.isCompressed && (
                      <Badge variant="outline">Compressed</Badge>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreBackup(backup.id)}
                      disabled={isRestoringBackup}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Restore
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                      disabled={isDeletingBackup === backup.id}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingBackup === backup.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            About Database Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your database backups are encrypted and stored securely in the cloud. 
              They include all your apps, settings, and chat history.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">What's included in backups:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• All your app projects and metadata</li>
              <li>• Chat conversations and AI interactions</li>
              <li>• User preferences and settings</li>
              <li>• Custom language models and providers</li>
              <li>• Version history and app snapshots</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">What's NOT included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Source code files (use app sync for this)</li>
              <li>• Temporary files and caches</li>
              <li>• API keys and sensitive credentials</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


