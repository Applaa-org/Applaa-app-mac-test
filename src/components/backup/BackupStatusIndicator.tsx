/**
 * Backup Status Indicator Component
 * 
 * Shows backup status for individual apps in the sidebar
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Cloud, 
  CloudOff, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BackupStatusIndicatorProps {
  appId: number;
  lastBackup?: Date;
  isBackupEnabled?: boolean;
  syncStatus?: 'synced' | 'pending' | 'error' | 'never';
  className?: string;
}

export const BackupStatusIndicator: React.FC<BackupStatusIndicatorProps> = ({
  appId,
  lastBackup,
  isBackupEnabled = false,
  syncStatus = 'never',
  className = ''
}) => {
  if (!isBackupEnabled) {
    return null;
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      default:
        return <CloudOff className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return lastBackup 
          ? `Synced ${formatDistanceToNow(lastBackup, { addSuffix: true })}`
          : 'Synced';
      case 'pending':
        return 'Sync pending...';
      case 'error':
        return 'Sync failed';
      default:
        return 'Not synced';
    }
  };

  const getVariant = () => {
    switch (syncStatus) {
      case 'synced':
        return 'default' as const;
      case 'pending':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()}
            className={`flex items-center gap-1 text-xs ${className}`}
          >
            {getStatusIcon()}
            <HardDrive className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


