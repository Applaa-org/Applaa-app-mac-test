/**
 * Mobile IPC Handlers - Registration and Exports
 * 
 * This module registers all mobile-related IPC handlers and exports them for use.
 */

import { ipcMain } from 'electron';
import { 
  executeFlutterDoctor,
  checkFlutterSDK,
  getFlutterVersion,
  installFlutterSDK,
  isFlutterInPath,
  getFlutterPath,
  validateFlutterEnvironment
} from './flutter_environment_handlers';
import {
  createFlutterProject,
  validateFlutterProject,
  getProjectDependencies
} from './flutter_project_handlers';

/**
 * Register all mobile-related IPC handlers
 */
export function registerMobileHandlers() {
  // Flutter Environment Handlers
  ipcMain.handle('flutter:doctor', async (): Promise<ReturnType<typeof executeFlutterDoctor>> => {
    try {
      const result = await executeFlutterDoctor();
      console.log('[IPC] Flutter doctor completed successfully');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter doctor failed:', error);
      throw new Error(`[flutter:doctor] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:check-sdk', async (): Promise<ReturnType<typeof checkFlutterSDK>> => {
    try {
      const result = await checkFlutterSDK();
      console.log('[IPC] Flutter SDK check completed:', result.installed ? 'installed' : 'not installed');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter SDK check failed:', error);
      throw new Error(`[flutter:check-sdk] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:get-version', async (): Promise<ReturnType<typeof getFlutterVersion>> => {
    try {
      const result = await getFlutterVersion();
      console.log('[IPC] Flutter version check completed:', result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter version check failed:', error);
      throw new Error(`[flutter:get-version] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:install-sdk', async (): Promise<ReturnType<typeof installFlutterSDK>> => {
    try {
      const result = await installFlutterSDK();
      console.log('[IPC] Flutter SDK installation guidance provided');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter SDK installation guidance failed:', error);
      throw new Error(`[flutter:install-sdk] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:is-in-path', async (): Promise<boolean> => {
    try {
      const result = await isFlutterInPath();
      console.log('[IPC] Flutter PATH check completed:', result ? 'found' : 'not found');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter PATH check failed:', error);
      throw new Error(`[flutter:is-in-path] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:get-path', async (): Promise<ReturnType<typeof getFlutterPath>> => {
    try {
      const result = await getFlutterPath();
      console.log('[IPC] Flutter path lookup completed:', result.success ? 'found' : 'not found');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter path lookup failed:', error);
      throw new Error(`[flutter:get-path] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:validate-environment', async (): Promise<ReturnType<typeof validateFlutterEnvironment>> => {
    try {
      const result = await validateFlutterEnvironment();
      console.log('[IPC] Flutter environment validation completed:', result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter environment validation failed:', error);
      throw new Error(`[flutter:validate-environment] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Flutter Project Handlers
  ipcMain.handle('flutter:create-project', async (
    event: Electron.IpcMainInvokeEvent,
    options: Parameters<typeof createFlutterProject>[0]
  ): Promise<ReturnType<typeof createFlutterProject>> => {
    try {
      console.log('[IPC] Creating Flutter project:', options.displayName);
      const result = await createFlutterProject(options);
      
      if (result.success) {
        console.log('[IPC] Flutter project created successfully:', result.data.path);
      } else {
        console.error('[IPC] Flutter project creation failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[IPC] Flutter project creation error:', error);
      throw new Error(`[flutter:create-project] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:validate-project', async (
    event: Electron.IpcMainInvokeEvent,
    projectPath: string
  ): Promise<ReturnType<typeof validateFlutterProject>> => {
    try {
      const result = await validateFlutterProject(projectPath);
      console.log('[IPC] Flutter project validation completed:', result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter project validation failed:', error);
      throw new Error(`[flutter:validate-project] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle('flutter:get-dependencies', async (
    event: Electron.IpcMainInvokeEvent,
    projectPath: string
  ): Promise<ReturnType<typeof getProjectDependencies>> => {
    try {
      const result = await getProjectDependencies(projectPath);
      console.log('[IPC] Flutter project dependencies retrieved:', result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      console.error('[IPC] Flutter project dependencies retrieval failed:', error);
      throw new Error(`[flutter:get-dependencies] ${error instanceof Error ? error.message : String(error)}`);
    }
  });

}

// Export handler functions for testing
export {
  executeFlutterDoctor,
  checkFlutterSDK,
  getFlutterVersion,
  installFlutterSDK,
  createFlutterProject,
  validateFlutterProject,
  getProjectDependencies
};


