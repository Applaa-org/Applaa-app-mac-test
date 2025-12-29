import { ipcMain } from 'electron';
import { SecurityScanner, type SecurityReviewResult } from '@/services/security-scanner';
import { getDyadAppPath } from '@/paths/paths';
import { readSettings } from '@/main/settings';
import log from 'electron-log';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';

const logger = log.scope('security_handlers');

export function registerSecurityHandlers() {
  /**
   * Run security review for an app
   * Similar to Dyad's security review feature
   */
  ipcMain.handle('security:review', async (event, { appId }: { appId: number }) => {
    try {
      logger.info(`Running security review for app ${appId}`);
      
      // Get app from database
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      
      if (!app || !app.path) {
        throw new Error(`App ${appId} not found or has no path`);
      }
      
      const appPath = getDyadAppPath(app.path);
      
      // Get user settings and selected model for AI scanning
      const settings = readSettings();
      const model = settings.selectedModel || {
        name: 'auto',
        provider: 'auto',
      };
      
      logger.info(`Using model: ${model.provider}/${model.name} for security scan`);
      
      const scanner = new SecurityScanner(appPath, settings, model);
      const issues = await scanner.scanForSecurityIssues();

      const highCount = issues.filter(i => i.level === 'high').length;
      const mediumCount = issues.filter(i => i.level === 'medium').length;
      const lowCount = issues.filter(i => i.level === 'low').length;

      const result: SecurityReviewResult = {
        issues,
        lastReviewed: Date.now(),
        highCount,
        mediumCount,
        lowCount,
      };

      logger.info(`Security review completed: ${highCount} high, ${mediumCount} medium, ${lowCount} low issues`);
      return result;
    } catch (error) {
      logger.error('Security review failed:', error);
      throw error;
    }
  });
}

