import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IpcClient } from '@/ipc/ipc_client';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { useRunApp } from '@/hooks/useRunApp';

interface WebPreviewTimeoutPopupProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function WebPreviewTimeoutPopup({ isOpen, message, onClose }: WebPreviewTimeoutPopupProps) {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { restartApp } = useRunApp();

  const handleRebuild = async () => {
    if (!selectedAppId) return;
    
    try {
      // Restart the web app with node_modules cleanup
      await restartApp({ removeNodeModules: true });
      onClose();
    } catch (error) {
      console.error('Failed to rebuild web app:', error);
    }
  };

  const handleRestart = async () => {
    if (!selectedAppId) return;
    
    try {
      // Restart the web app without node_modules cleanup
      await restartApp({ removeNodeModules: false });
      onClose();
    } catch (error) {
      console.error('Failed to restart web app:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Web App Taking Longer Than Expected
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {message}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleRebuild}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Rebuild App
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Restart Server
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
