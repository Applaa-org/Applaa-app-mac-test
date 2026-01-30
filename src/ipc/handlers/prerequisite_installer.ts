import { ipcMain } from 'electron';
import log from 'electron-log';

const logger = log.scope('prerequisite-installer');
import { 
  checkPrerequisites, 
  installPrerequisites, 
  PrerequisiteStatus, 
  PrerequisiteInstallResult 
} from '../../lib/hermetic-runtime';

/**
 * 🚀 PREREQUISITE INSTALLER IPC HANDLERS
 * Handles hierarchical dependency installation for non-technical users
 */

/**
 * Check all system prerequisites
 */
ipcMain.handle('prerequisites:check', async (): Promise<PrerequisiteStatus[]> => {
  try {
    logger.info('🔍 Checking system prerequisites...');
    const prerequisites = await checkPrerequisites();
    logger.info(`✅ Prerequisites check completed: ${prerequisites.length} items checked`);
    return prerequisites;
  } catch (error) {
    logger.error('❌ Failed to check prerequisites:', error);
    throw error;
  }
});

/**
 * Install all prerequisites hierarchically
 */
ipcMain.handle('prerequisites:install', async (event, options: {
  skipSystem?: boolean;
  skipDevelopment?: boolean;
  skipAndroid?: boolean;
  skipIOS?: boolean;
  skipExpo?: boolean;
  forceReinstall?: boolean;
} = {}): Promise<PrerequisiteInstallResult> => {
  try {
    logger.info('🚀 Starting hierarchical prerequisite installation...');
    const result = await installPrerequisites(options);
    
    if (result.success) {
      logger.info(`✅ Prerequisites installation completed successfully in ${(result.totalTime / 1000).toFixed(1)}s`);
    } else {
      logger.warn(`⚠️ Prerequisites installation completed with ${result.failed.length} failures`);
    }
    
    return result;
  } catch (error) {
    logger.error('❌ Prerequisites installation failed:', error);
    throw error;
  }
});

/**
 * Check prerequisites status (quick check)
 */
ipcMain.handle('prerequisites:status', async (): Promise<{
  ready: boolean;
  missing: string[];
  total: number;
  installed: number;
}> => {
  try {
    const prerequisites = await checkPrerequisites();
    const missing = prerequisites.filter(p => !p.installed && p.required);
    const installed = prerequisites.filter(p => p.installed).length;
    
    return {
      ready: missing.length === 0,
      missing: missing.map(p => p.name),
      total: prerequisites.length,
      installed
    };
  } catch (error) {
    logger.error('❌ Failed to get prerequisites status:', error);
    throw error;
  }
});

/**
 * Get installation progress (for real-time updates)
 */
ipcMain.handle('prerequisites:progress', async (): Promise<{
  phase: string;
  current: string;
  progress: number;
  logs: string[];
}> => {
  try {
    // This would be implemented with a progress tracking system
    // For now, return a basic status
    return {
      phase: 'Checking prerequisites...',
      current: 'System check',
      progress: 0,
      logs: ['Starting prerequisite check...']
    };
  } catch (error) {
    logger.error('❌ Failed to get prerequisites progress:', error);
    throw error;
  }
});

/**
 * Register all prerequisite installer handlers
 */
export function registerPrerequisiteInstallerHandlers(): void {
  
  // Handlers are already registered above with ipcMain.handle
  // This function is for consistency with other handler modules
  
}
