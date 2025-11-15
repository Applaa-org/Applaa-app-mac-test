import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useLoadAppFile(appId: number | null, filePath: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      if (appId === null || filePath === null) {
        setContent(null);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const ipcClient = IpcClient.getInstance();
        const fileContent = await ipcClient.readAppFile(appId, filePath);

        setContent(fileContent);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide more helpful error messages for common file structure issues
        let friendlyError = errorMessage;
        if (errorMessage.includes('File not found')) {
          if (filePath === 'src/App.tsx') {
            friendlyError = `File not found: ${filePath}. This app may use Expo Router structure (app/index.tsx) instead of React Native CLI structure (src/App.tsx).`;
          } else if (filePath === 'app/index.tsx') {
            friendlyError = `File not found: ${filePath}. This app may use React Native CLI structure (src/App.tsx) instead of Expo Router structure (app/index.tsx).`;
          } else {
            friendlyError = `File not found: ${filePath}. The app structure may be incomplete or corrupted.`;
          }
        }
        
        console.error(
          `Error loading file ${filePath} for app ${appId}:`,
          error,
        );
        setError(new Error(friendlyError));
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [appId, filePath]);

  const refreshFile = async () => {
    if (appId === null || filePath === null) {
      return;
    }

    setLoading(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const fileContent = await ipcClient.readAppFile(appId, filePath);
      setContent(fileContent);
      setError(null);
    } catch (error) {
      console.error(
        `Error refreshing file ${filePath} for app ${appId}:`,
        error,
      );
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  return { content, loading, error, refreshFile };
}
