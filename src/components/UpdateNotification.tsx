import React, { useEffect, useState } from "react";
import { Download, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateNotificationProps {
  className?: string;
}

export function UpdateNotification({ className }: UpdateNotificationProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Listen for update events from main process
    const electron = (window as any).electron;
    if (!electron) return;

    const unsubscribeChecking = electron.ipcRenderer.on(
      "update:checking",
      () => {
        // Update is being checked
      }
    );

    const unsubscribeAvailable = electron.ipcRenderer.on(
      "update:available",
      (_event: any, info: UpdateInfo) => {
        setUpdateInfo(info);
        setIsDismissed(false);
        setIsDownloaded(false);
        setDownloadProgress(null);
      }
    );

    const unsubscribeNotAvailable = electron.ipcRenderer.on(
      "update:not-available",
      () => {
        // No update available, hide notification
        setUpdateInfo(null);
      }
    );

    const unsubscribeDownloadProgress = electron.ipcRenderer.on(
      "update:download-progress",
      (_event: any, progress: { percent: number }) => {
        setDownloadProgress(progress.percent);
      }
    );

    const unsubscribeDownloaded = electron.ipcRenderer.on(
      "update:downloaded",
      (_event: any, info: UpdateInfo) => {
        setIsDownloaded(true);
        setDownloadProgress(100);
        setUpdateInfo(info);
      }
    );

    const unsubscribeError = electron.ipcRenderer.on(
      "update:error",
      (_event: any, error: string) => {
        console.error("Update error:", error);
        // Optionally show error toast
      }
    );

    return () => {
      unsubscribeChecking?.();
      unsubscribeAvailable?.();
      unsubscribeNotAvailable?.();
      unsubscribeDownloadProgress?.();
      unsubscribeDownloaded?.();
      unsubscribeError?.();
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setUpdateInfo(null);
  };

  const handleRestart = () => {
    // Send message to main process to restart and install update
    const electron = (window as any).electron;
    if (electron) {
      electron.ipcRenderer.invoke("update:restart-and-install");
    }
  };

  if (!updateInfo || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border bg-background shadow-lg transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Download className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">
              {isDownloaded ? "Update Ready" : "Update Available"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Version {updateInfo.version} is available
            {isDownloaded && " and ready to install"}
          </p>
          {downloadProgress !== null && !isDownloaded && (
            <div className="mb-2">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Downloading... {Math.round(downloadProgress)}%
              </p>
            </div>
          )}
          {isDownloaded && (
            <Button
              size="sm"
              onClick={handleRestart}
              className="mt-2 h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Restart to Update
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
