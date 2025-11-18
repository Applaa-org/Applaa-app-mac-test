import { ipcMain } from 'electron';
import log from 'electron-log';
import { ExpoAppRepairer } from '../../lib/expo/ExpoAppRepairer';

const logger = log.scope("app_repair_handlers");

export function registerAppRepairHandlers() {
  logger.info('🔧 Registering app repair handlers');

  // Repair any broken Expo app
  ipcMain.handle("app:repair", async (
    _,
    params: { appPath: string }
  ): Promise<{
    success: boolean;
    repaired: boolean;
    issues: string[];
    fixes: string[];
    warnings: string[];
    updatedDependencies: string[];
    installedPackages: string[];
  }> => {
    try {
      logger.info(`🔧 Starting app repair for: ${params.appPath}`);
      
      const repairer = new ExpoAppRepairer(params.appPath);
      const result = await repairer.repairApp();
      
      logger.info(`🔧 App repair completed. Success: ${result.success}, Repaired: ${result.repaired}`);
      
      return result;
      
    } catch (error) {
      logger.error('Failed to repair app:', error);
      return {
        success: false,
        repaired: false,
        issues: [`Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fixes: [],
        warnings: [],
        updatedDependencies: [],
        installedPackages: []
      };
    }
  });

  // Check if an app needs repair
  ipcMain.handle("app:check-repair-needed", async (
    _,
    params: { appPath: string }
  ): Promise<{
    needsRepair: boolean;
    issues: string[];
    warnings: string[];
    missingDependencies: string[];
    outdatedDependencies: string[];
  }> => {
    try {
      logger.info(`🔍 Checking if app needs repair: ${params.appPath}`);
      
      const repairer = new ExpoAppRepairer(params.appPath);
      
      // We'll use the private analyzeDependencies method through a public interface
      const analysis = await (repairer as any).analyzeDependencies();
      
      return {
        needsRepair: analysis.needsRepair,
        issues: analysis.issues,
        warnings: analysis.warnings,
        missingDependencies: analysis.missingDependencies,
        outdatedDependencies: analysis.outdatedDependencies
      };
      
    } catch (error) {
      logger.error('Failed to check repair status:', error);
      return {
        needsRepair: true,
        issues: [`Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        missingDependencies: [],
        outdatedDependencies: []
      };
    }
  });

  logger.info('✅ App repair handlers registered');
}
