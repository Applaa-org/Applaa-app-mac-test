import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess, showError } from "@/lib/toast";

export function CustomAppsDirectorySelector() {
  const { settings, updateSettings } = useSettings();
  const [isSelecting, setIsSelecting] = useState(false);
  
  const [defaultPath, setDefaultPath] = useState<string>("");
  const currentPath = settings?.customAppsDirectory || defaultPath || "";

  // Fetch default base path from main process on mount
  useEffect(() => {
    (async () => {
      try {
        const { basePath } = await IpcClient.getInstance().getAppsBasePath();
        setDefaultPath(basePath);
      } catch (error) {
        // If it fails, just leave it blank; UI will still function
      }
    })();
  }, []);

  const handleSelectDirectory = async () => {
    try {
      setIsSelecting(true);
      
      // Open directory picker dialog
      const result = await IpcClient.getInstance().selectDirectory({
        title: "Select Apps Directory",
        defaultPath: currentPath,
      });
      
      if (result.path) {
        await updateSettings({
          customAppsDirectory: result.path,
        });
        showSuccess(`Apps directory updated to: ${result.path}`);
      }
    } catch (error) {
      showError(error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      await updateSettings({
        customAppsDirectory: undefined, // This will use the default
      });
      showSuccess(`Apps directory reset to default: ${defaultPath}`);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Apps Directory
      </Label>
      
      <div className="flex items-center gap-2">
        <Input
          value={currentPath}
          readOnly
          className="flex-1 bg-gray-50 dark:bg-gray-700"
          placeholder="Apps will be stored here..."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectDirectory}
          disabled={isSelecting}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          {isSelecting ? "Selecting..." : "Browse"}
        </Button>
        {settings?.customAppsDirectory && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
          >
            Reset
          </Button>
        )}
      </div>
      
      {defaultPath && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          All your Applaa apps will be stored in this directory. Default: {defaultPath}
        </p>
      )}
    </div>
  );
}
