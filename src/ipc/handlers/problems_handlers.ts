import { db } from "../../db";

import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateProblemReport } from "../processors/tsc";
import { getDyadAppPath } from "@/paths/paths";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { CodeValidator } from "../../services/code-validator";
import { AutoFixer } from "../../services/auto-fixer";
import type { Problem } from "../ipc_types";

const logger = log.scope("problems_handlers");
const handle = createLoggedHandler(logger);

// Helper function for legacy-safe app queries
async function getAppSafe(appId: number): Promise<any> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    return app as any;
  } catch (err) {
    logger.warn("problems_handlers.getAppSafe: falling back to legacy SELECT due to:", err);
    const row = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, " +
          "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
          "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
          "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
          "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
          "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
      )
      .get(appId) as any;

    if (!row) return undefined;

    // Convert legacy timestamps
    if (row.createdAt && typeof row.createdAt === "number") {
      row.createdAt = new Date(row.createdAt * 1000);
    }
    if (row.updatedAt && typeof row.updatedAt === "number") {
      row.updatedAt = new Date(row.updatedAt * 1000);
    }

    // New fields absent in legacy DBs
    row.displayName = undefined;
    row.packageId = undefined;
    row.slug = undefined;

    return row;
  }
}

export function registerProblemsHandlers() {
  // Handler to check problems using autofix with empty response
  handle("check-problems", async (event, params: { appId: number }) => {
    try {
      // Get the app to find its path
      const app = await getAppSafe(params.appId);

      if (!app) {
        throw new Error(`App not found: ${params.appId}`);
      }

      const appPath = getDyadAppPath(app.path);

      // 🚀 ENHANCED: Run both TypeScript checking AND platform validation
      logger.info(`[ProblemsHandler] Running comprehensive checks for app ${params.appId}`);

      // 1. Run TypeScript checking (existing)
      const tscReport = await generateProblemReport({
        fullResponse: "",
        appPath,
      });

      // 2. Run platform validation (new CodeValidator)
      let platformProblems: Problem[] = [];
      let autoFixableProblemsFromValidator: any[] = [];
      
      try {
        logger.info(`[ProblemsHandler] Starting platform validation for app path: ${appPath}`);
        
        // 🚀 NEW: Pass app info to CodeValidator for app type detection
        const appInfo = {
          appType: app.appType,
          files: app.files
        };
        logger.info(`[ProblemsHandler] App info:`, { appType: app.appType, fileCount: app.files?.length || 0 });
        
        const validator = new CodeValidator(appPath, appInfo);
        const validationResult = await validator.validateApp();
        
        logger.info(`[ProblemsHandler] Validation result:`, {
          total: validationResult.total,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          isValidForPreview: validationResult.isValidForPreview
        });
        
        logger.info(`[ProblemsHandler] Raw problems from validator:`, validationResult.problems.map(p => ({
          type: p.type,
          category: p.category,
          file: p.file,
          message: p.message,
          autoFixable: p.autoFixable,
          code: p.code
        })));
        
        // Store auto-fixable problems for later
        autoFixableProblemsFromValidator = validationResult.problems.filter(p => p.autoFixable);
        logger.info(`[ProblemsHandler] Found ${autoFixableProblemsFromValidator.length} auto-fixable problems`);
        
        // Convert validation problems to the format expected by the UI (shared/tsc_types.ts)
        platformProblems = validationResult.problems.map(p => ({
          file: p.file,
          line: p.line || 0,
          column: p.column || 0,
          message: `[${p.category.toUpperCase()}] ${p.message}`,
          code: p.type === 'error' ? 2000 : 1000, // Use numeric codes: 2000 for errors, 1000 for warnings
          snippet: p.code || '' // Use the code snippet if available
        }));
        
        logger.info(`[ProblemsHandler] Converted ${platformProblems.length} platform-specific issues to UI format`);
      } catch (error) {
        logger.error(`[ProblemsHandler] Platform validation failed:`, error);
      }

      // 3. Merge both problem sets
      const mergedProblems = [...tscReport.problems, ...platformProblems];
      
      // 4. Auto-fix any auto-fixable platform problems (Scenario B)
      if (autoFixableProblemsFromValidator.length > 0) {
        logger.info(`[ProblemsHandler] Auto-fixing ${autoFixableProblemsFromValidator.length} platform issues...`);
        logger.info(`[ProblemsHandler] Auto-fixable problems:`, autoFixableProblemsFromValidator.map(p => ({
          message: p.message,
          code: p.code,
          autoFixable: p.autoFixable,
          category: p.category
        })));
        
        try {
          // 🚀 NEW: Pass app info to AutoFixer for app type detection
          const autoFixer = new AutoFixer(appPath, appInfo);
          let fixedCount = 0;
          let needsDependencyInstall = false;
          
          for (const problem of autoFixableProblemsFromValidator) {
            logger.info(`[ProblemsHandler] Attempting to fix: ${problem.message} (${problem.code})`);
            const fixResult = await autoFixer.fixProblem(problem);
            logger.info(`[ProblemsHandler] Fix result:`, fixResult);
            
            if (fixResult.success) {
              fixedCount++;
              logger.info(`[ProblemsHandler] ✅ Auto-fixed: ${problem.message}`);
              
              // 🚀 NEW: Check if this fix requires dependency installation
              if (fixResult.filesModified.some(f => f.startsWith('INSTALL:') || f.startsWith('REMOVE_NODE_MODULES') || f.startsWith('REINSTALL_MODULE:'))) {
                needsDependencyInstall = true;
                logger.info(`[ProblemsHandler] This fix requires dependency installation`);
              }
              
              // Remove fixed problem from the merged list
              const messageToRemove = `[${problem.category.toUpperCase()}] ${problem.message}`;
              const index = mergedProblems.findIndex(p => p.message === messageToRemove);
              if (index > -1) {
                mergedProblems.splice(index, 1);
                logger.info(`[ProblemsHandler] Removed fixed problem from merged list`);
              } else {
                logger.warn(`[ProblemsHandler] Could not find problem to remove: ${messageToRemove}`);
              }
            } else {
              logger.warn(`[ProblemsHandler] ❌ Failed to auto-fix: ${problem.message} - ${fixResult.message}`);
            }
          }
          
          // 🚀 NEW: Install dependencies if needed
          if (needsDependencyInstall) {
            logger.info(`[ProblemsHandler] Installing dependencies after auto-fix...`);
            try {
              const { spawn } = await import('child_process');
              
              // Run npm install with clean install
              const installProcess = spawn('npm', ['install', '--legacy-peer-deps', '--force'], {
                cwd: appPath,
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
              });
              
              let installOutput = '';
              let installError = '';
              
              installProcess.stdout?.on('data', (data) => {
                installOutput += data.toString();
                logger.info(`[npm install] ${data.toString().trim()}`);
              });
              
              installProcess.stderr?.on('data', (data) => {
                installError += data.toString();
                logger.info(`[npm install:err] ${data.toString().trim()}`);
              });
              
              await new Promise((resolve, reject) => {
                installProcess.on('close', (code) => {
                  if (code === 0) {
                    logger.info(`[ProblemsHandler] ✅ Dependencies installed successfully`);
                    resolve(true);
                  } else {
                    logger.error(`[ProblemsHandler] ❌ npm install failed with code ${code}`);
                    reject(new Error(`npm install failed with code ${code}`));
                  }
                });
                
                installProcess.on('error', (error) => {
                  logger.error(`[ProblemsHandler] ❌ npm install process error:`, error);
                  reject(error);
                });
              });
              
            } catch (installError) {
              logger.error(`[ProblemsHandler] Failed to install dependencies:`, installError);
            }
          }
          
          logger.info(`[ProblemsHandler] Auto-fix summary: ${fixedCount}/${autoFixableProblemsFromValidator.length} problems fixed`);
        } catch (error) {
          logger.error(`[ProblemsHandler] Auto-fix failed with error:`, error);
        }
      } else {
        logger.info(`[ProblemsHandler] No auto-fixable problems found`);
      }

      logger.info(`[ProblemsHandler] Total problems: ${mergedProblems.length} (${mergedProblems.filter(p => p.code >= 2000).length} errors)`);

      return {
        ...tscReport,
        problems: mergedProblems
      };
    } catch (error) {
      logger.error("Error checking problems:", error);
      throw error;
    }
  });
}
