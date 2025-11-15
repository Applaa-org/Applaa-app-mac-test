/**
 * IPC Handlers for Code Validation and Auto-Fixing
 */

import { ipcMain } from 'electron';
import { CodeValidator, type ValidationResult } from '../../services/code-validator';
import { AutoFixer, type FixResult } from '../../services/auto-fixer';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { Problem } from '../../services/code-validator';
import log from 'electron-log';

const logger = log.scope('code_validation');

async function getAppPath(appId: number): Promise<string> {
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });
  
  if (!app) {
    throw new Error(`App with id ${appId} not found`);
  }
  
  return getDyadAppPath(app.path);
}

export function registerCodeValidationHandlers() {
  /**
   * Validate app code
   */
  ipcMain.handle('code:validate', async (_, params: { appId: number }): Promise<ValidationResult> => {
    try {
      const { appId } = params;
      const appPath = getAppPath(appId);

      console.log(`[CodeValidation] Validating app ${appId} at ${appPath}`);

      const validator = new CodeValidator(appPath);
      const result = await validator.validateApp();

      console.log(`[CodeValidation] Found ${result.total} problems (${result.errors} errors, ${result.warnings} warnings)`);

      return result;
    } catch (error) {
      console.error('[CodeValidation] Validation failed:', error);
      throw new Error(`Code validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Auto-fix a single problem
   */
  ipcMain.handle('code:auto-fix', async (_, params: { appId: number; problem: Problem }): Promise<FixResult> => {
    try {
      const { appId, problem } = params;
      const appPath = getAppPath(appId);

      console.log(`[CodeValidation] Auto-fixing problem in app ${appId}: ${problem.code}`);

      const fixer = new AutoFixer(appPath);
      const result = await fixer.fixProblem(problem);

      if (result.success) {
        console.log(`[CodeValidation] Successfully fixed problem: ${result.message}`);
      } else {
        console.log(`[CodeValidation] Could not fix problem: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('[CodeValidation] Auto-fix failed:', error);
      throw new Error(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Auto-fix all fixable problems
   */
  ipcMain.handle('code:auto-fix-all', async (_, params: { appId: number; problems: Problem[] }): Promise<FixResult> => {
    try {
      const { appId, problems } = params;
      const appPath = getAppPath(appId);

      console.log(`[CodeValidation] Auto-fixing all problems in app ${appId}`);

      const fixer = new AutoFixer(appPath);
      const result = await fixer.fixAll(problems);

      console.log(`[CodeValidation] ${result.message}`);

      // If there are packages to install, return them
      const packagesToInstall = result.filesModified
        .filter(f => f.startsWith('INSTALL:'))
        .map(f => f.replace('INSTALL:', ''));

      if (packagesToInstall.length > 0) {
        return {
          ...result,
          filesModified: result.filesModified.filter(f => !f.startsWith('INSTALL:')),
          message: `${result.message}. Need to install: ${packagesToInstall.join(', ')}`
        };
      }

      return result;
    } catch (error) {
      console.error('[CodeValidation] Auto-fix-all failed:', error);
      throw new Error(`Auto-fix-all failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Validate and fix in one step
   */
  ipcMain.handle('code:validate-and-fix', async (_, params: { appId: number }): Promise<{
    validation: ValidationResult;
    fix: FixResult;
  }> => {
    try {
      const { appId } = params;
      const appPath = getAppPath(appId);

      console.log(`[CodeValidation] Validate and fix app ${appId}`);

      // First validate
      const validator = new CodeValidator(appPath);
      const validation = await validator.validateApp();

      // Then auto-fix if there are fixable problems
      let fix: FixResult = {
        success: false,
        message: 'No fixable problems',
        filesModified: []
      };

      const fixableProblems = validation.problems.filter(p => p.autoFixable);
      if (fixableProblems.length > 0) {
        const fixer = new AutoFixer(appPath);
        fix = await fixer.fixAll(fixableProblems);

        // Re-validate after fixing
        if (fix.success) {
          const newValidation = await validator.validateApp();
          return { validation: newValidation, fix };
        }
      }

      return { validation, fix };
    } catch (error) {
      console.error('[CodeValidation] Validate-and-fix failed:', error);
      throw new Error(`Validate-and-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log('✅ Code validation handlers registered');
}
