import { useEffect, useState } from 'react';
import { IpcClient } from '@/ipc/ipc_client';
import type { App } from '@/ipc/ipc_types';
import { setAppCategory, type AppCategory } from '@/utils/appTypeDetection';

interface AppTypeInfo {
  appId: number;
  isCapacitor: boolean;
  isFlutter: boolean;
  isExpo: boolean;
}

/**
 * Hook to detect app types using existing IPC handlers
 */
export function useAppTypes(apps: App[]) {
  const [appTypes, setAppTypes] = useState<Map<number, AppCategory>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Always set loading to false and clear types if no apps
    if (!apps || apps.length === 0) {
      setAppTypes(new Map());
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const detectAppTypes = async () => {
      if (isCancelled) return;
      
      setLoading(true);
      const ipcClient = IpcClient.getInstance();
      const typeMap = new Map<number, AppCategory>();

      try {
        // Process apps sequentially to avoid overwhelming the IPC system
        for (const app of apps) {
          if (isCancelled) break;
          
          try {
            // Check if it's a Capacitor app
            const isCapacitor = await ipcClient.isCapacitor({ appId: app.id });
            
            // Check if it's a Flutter app  
            const isFlutter = await ipcClient.isFlutterMobile({ appId: app.id });

            // Determine category based on checks and file structure
            let category: AppCategory = 'web'; // default

            if (isCapacitor) {
              category = 'capacitor';
            } else if (isFlutter) {
              category = 'flutter';
            } else {
              // Get app files for Expo detection
              const files = await ipcClient.getAppFiles(app.id);
              
              const hasExpoConfig = files.some(file => 
                file === 'app.json' || file === 'expo.json'
              );
              
              const hasExpoRouterStructure = files.some(file => 
                file.startsWith('app/') && (file.endsWith('.tsx') || file.endsWith('.ts'))
              );
              
              // Check for traditional web app files
              const hasTraditionalWebFiles = files.some(file => 
                file === 'index.html' || file === 'vite.config.js' || file === 'vite.config.ts'
              );
              
              // If it has app.json but no traditional web files, it's likely Expo
              // OR if it has both app.json and app/ structure, it's definitely Expo
              if (hasExpoConfig && (!hasTraditionalWebFiles || hasExpoRouterStructure)) {
                category = 'mobile';
              }
            }

            if (!isCancelled) {
              typeMap.set(app.id, category);
              // Also set in the global cache for the detection function
              setAppCategory(app.id, category);
            }
          } catch (error) {
            console.error(`Error detecting type for app ${app.id}:`, error);
            // Default to web if detection fails
            if (!isCancelled) {
              typeMap.set(app.id, 'web');
              setAppCategory(app.id, 'web');
            }
          }
        }

        if (!isCancelled) {
          setAppTypes(typeMap);
        }
      } catch (error) {
        console.error('Error detecting app types:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    detectAppTypes();

    // Cleanup function to cancel ongoing operations
    return () => {
      isCancelled = true;
    };
  }, [apps]);

  return { appTypes, loading };
}
