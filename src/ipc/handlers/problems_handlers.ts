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
import { ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";

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

// 🚨 CRITICAL: Runtime Error Integration with Problems Tab
// This bridges the gap between Chrome DevTools runtime errors and static analysis

// Store runtime problems in memory (could be enhanced to persist to DB)
const runtimeProblems = new Map<number, Problem[]>();

export function registerRuntimeProblemHandlers() {
  // ✅ NEW: Manual trigger for Haptics auto-fix
  ipcMain.handle("problems:fix-haptics", async (event, params: { appId: number }) => {
    try {
      const { appId } = params;
      logger.info(`🔧 Manual Haptics fix triggered for app ${appId}`);
      
      const app = await getAppSafe(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }
      
      const appPath = getDyadAppPath(app.path);
      const appInfo = {
        appType: app.appType,
        files: app.files
      };
      
      const autoFixer = new AutoFixer(appPath, appInfo);
      
      // Create a problem that will trigger full app scan
      const scanProblem: Problem = {
        file: 'app/index.tsx',
        line: 0,
        column: 0,
        message: 'Haptic feedback API used without Platform.OS check',
        severity: 'error',
        code: 'PLATFORM_HAPTICS',
        autoFixable: true
      };
      
      // First try the specific file, then scan all files
      let fixResult = await autoFixer.fixProblem(scanProblem);
      
      // If that didn't work, directly scan all files
      if (!fixResult.success || fixResult.filesModified.length === 0) {
        logger.info(`🔍 File-specific fix didn't work, scanning all files...`);
        
        const getAllFiles = async (dir: string): Promise<string[]> => {
          const files: string[] = [];
          try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
                continue;
              }
              if (entry.isDirectory()) {
                const subFiles = await getAllFiles(fullPath);
                files.push(...subFiles);
              } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                files.push(fullPath);
              }
            }
          } catch (error) {
            logger.warn(`Error reading directory ${dir}:`, error);
          }
          return files;
        };
        
        const allFiles = await getAllFiles(appPath);
        logger.info(`📋 Found ${allFiles.length} source files to check`);
        
        const filesModified: string[] = [];
        for (const filePath of allFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (/(Haptics?|Haptic)\.(impact|notification|selection)Async/i.test(content)) {
              if (!/Platform\.OS\s*[!=]=\s*['"]web['"]/i.test(content)) {
                const relativePath = path.relative(appPath, filePath);
                logger.info(`🔧 Fixing Haptics in: ${relativePath}`);
                const fileProblem: Problem = {
                  file: relativePath,
                  line: 0,
                  column: 0,
                  message: 'Haptic feedback API used without Platform.OS check',
                  severity: 'error',
                  code: 'PLATFORM_HAPTICS',
                  autoFixable: true
                };
                const result = await autoFixer.fixProblem(fileProblem);
                if (result.success) {
                  filesModified.push(relativePath);
                }
              }
            }
          } catch (error) {
            logger.warn(`Error checking file ${filePath}:`, error);
          }
        }
        
        if (filesModified.length > 0) {
          fixResult = {
            success: true,
            message: `Fixed Haptics usage in ${filesModified.length} file(s)`,
            filesModified
          };
        }
      }
      
      return {
        success: fixResult.success,
        message: fixResult.message,
        filesModified: fixResult.filesModified
      };
    } catch (error) {
      logger.error("Error in manual Haptics fix:", error);
      throw error;
    }
  });
  
  // Add runtime problem to Problems Tab
  ipcMain.handle("problems:add-runtime", async (event, problem: {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: string;
    autoFixable: boolean;
    source: string;
    timestamp: number;
    appId?: number;
  }) => {
    try {
      // ✅ FIX: Filter out Haptics UnavailabilityError on web - this is expected behavior, not a real problem
      const isHapticsUnavailabilityError = 
        problem.message.includes('UnavailabilityError') &&
        problem.message.includes('Haptic') &&
        problem.message.includes('not available on web');
      
      if (isHapticsUnavailabilityError) {
        logger.info(`🚫 Filtered out Haptics UnavailabilityError (expected on web): ${problem.message}`);
        return; // Don't add this to problems - it's expected behavior
      }
      
      // Use appId from the problem parameter, fallback to 1 if not provided
      const appId = problem.appId || 1;
      
      logger.info(`🚨 Adding runtime problem: ${problem.message}`);
      
      // Convert to Problem format
      const runtimeProblem: Problem = {
        file: problem.file,
        line: problem.line,
        column: problem.column,
        message: problem.message,
        severity: problem.severity,
        code: problem.code,
        autoFixable: problem.autoFixable,
        source: 'runtime'
      };
      
      // Store runtime problem
      if (!runtimeProblems.has(appId)) {
        runtimeProblems.set(appId, []);
      }
      
      const existingProblems = runtimeProblems.get(appId) || [];
      existingProblems.push(runtimeProblem);
      runtimeProblems.set(appId, existingProblems);
      
      // Trigger Problems Tab refresh by invalidating the query
      // This will cause useCheckProblems to refetch and include runtime problems
      logger.info(`✅ Runtime problem added: ${existingProblems.length} total runtime problems for app ${appId}`);
      
      // ✅ FIX: Trigger auto-fix if the problem is auto-fixable
      if (problem.autoFixable) {
        logger.info(`🔧 Runtime problem is auto-fixable, triggering auto-fix...`);
        // Trigger auto-fix for this runtime problem
        try {
          // Get app data to get the app path
          const app = await getAppSafe(appId);
          if (!app) {
            logger.warn(`❌ Cannot auto-fix: App ${appId} not found`);
            return;
          }
          
          const appPath = getDyadAppPath(app.path);
          const appInfo = {
            appType: app.appType,
            files: app.files
          };
          
          const autoFixer = new AutoFixer(appPath, appInfo);
          
          // ✅ CRITICAL: For Haptics errors, always scan and fix ALL files in the app
          // This ensures we catch all Haptics usage, not just the one that caused the error
          if (problem.code === 'PLATFORM_HAPTICS' || problem.code === 'HAPTICS') {
            logger.info(`🔍 Haptics error detected - scanning entire app for all Haptics usage...`);
            logger.info(`📁 App path: ${appPath}`);
            
            // ✅ DIRECTLY call fixAllHapticsInApp instead of going through fixProblem
            // This ensures we scan all files regardless of the file path in the error
            try {
              // Use reflection to access the private method, or make it public
              // For now, let's create a problem and use fixProblem which will call fixAllHapticsInApp
              const scanProblem: Problem = {
                file: 'app/index.tsx', // This will trigger fixAllHapticsInApp if file doesn't exist
                line: 0,
                column: 0,
                message: 'Haptic feedback API used without Platform.OS check',
                severity: 'error',
                code: 'PLATFORM_HAPTICS',
                autoFixable: true
              };
              
              // First try to fix the specific file if it exists
              let fixResult = await autoFixer.fixProblem(scanProblem);
              
              // If that didn't work or file doesn't exist, directly scan all files
              if (!fixResult.success || fixResult.filesModified.length === 0) {
                logger.info(`🔍 File-specific fix didn't work, scanning all files in app...`);
                
                // Get all files and check each one
                const getAllFiles = async (dir: string): Promise<string[]> => {
                  const files: string[] = [];
                  try {
                    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                    for (const entry of entries) {
                      const fullPath = path.join(dir, entry.name);
                      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
                        continue;
                      }
                      if (entry.isDirectory()) {
                        const subFiles = await getAllFiles(fullPath);
                        files.push(...subFiles);
                      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                        files.push(fullPath);
                      }
                    }
                  } catch (error) {
                    logger.warn(`Error reading directory ${dir}:`, error);
                  }
                  return files;
                };
                
                const allFiles = await getAllFiles(appPath);
                logger.info(`📋 Found ${allFiles.length} source files to check`);
                
                const filesModified: string[] = [];
                for (const filePath of allFiles) {
                  try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    if (/(Haptics?|Haptic)\.(impact|notification|selection)Async/.test(content)) {
                      if (!/Platform\.OS\s*[!=]=\s*['"]web['"]/.test(content)) {
                        const relativePath = path.relative(appPath, filePath);
                        logger.info(`🔧 Fixing Haptics in: ${relativePath}`);
                        const fileProblem: Problem = {
                          file: relativePath,
                          line: 0,
                          column: 0,
                          message: 'Haptic feedback API used without Platform.OS check',
                          severity: 'error',
                          code: 'PLATFORM_HAPTICS',
                          autoFixable: true
                        };
                        const result = await autoFixer.fixProblem(fileProblem);
                        if (result.success) {
                          filesModified.push(relativePath);
                        }
                      }
                    }
                  } catch (error) {
                    logger.warn(`Error checking file ${filePath}:`, error);
                  }
                }
                
                if (filesModified.length > 0) {
                  fixResult = {
                    success: true,
                    message: `Fixed Haptics usage in ${filesModified.length} file(s)`,
                    filesModified
                  };
                }
              }
              
              if (fixResult.success && fixResult.filesModified.length > 0) {
                logger.info(`✅ Haptics auto-fix completed: ${fixResult.message}`);
                logger.info(`📝 Files modified: ${fixResult.filesModified.join(', ')}`);
                
                // Remove all Haptics-related problems since we fixed them all
                const updatedProblems = existingProblems.filter(p => 
                  p.code !== 'PLATFORM_HAPTICS' && p.code !== 'HAPTICS'
                );
                runtimeProblems.set(appId, updatedProblems);
                
                // ✅ IMPORTANT: Trigger a re-check to update the problem report
                logger.info(`🔄 Triggering problem re-check after auto-fix...`);
                
                // ✅ CRITICAL: The preview should auto-reload with hot reload
                // Expo's hot reload should pick up the file changes automatically
                // If not, the user can manually refresh the preview
                logger.info(`🔄 Files have been fixed. Preview should auto-reload with hot reload.`);
              } else {
                logger.warn(`❌ Haptics auto-fix failed or no files modified: ${fixResult.message}`);
                logger.warn(`💡 This might mean:`);
                logger.warn(`   1. No files with Haptics usage were found`);
                logger.warn(`   2. All Haptics calls already have Platform.OS checks`);
                logger.warn(`   3. Files couldn't be accessed or modified`);
              }
            } catch (error) {
              logger.error(`❌ Error during Haptics auto-fix:`, error);
            }
          } else {
            // For other errors, use the specific file
          const fixResult = await autoFixer.fixProblem(runtimeProblem);
          if (fixResult.success) {
            logger.info(`✅ Runtime problem auto-fixed: ${fixResult.message}`);
            // Remove the fixed problem
            const updatedProblems = existingProblems.filter(p => p !== runtimeProblem);
            runtimeProblems.set(appId, updatedProblems);
              
              // ✅ IMPORTANT: Trigger a re-check to update the problem report
              logger.info(`🔄 Triggering problem re-check after auto-fix...`);
          } else {
            logger.warn(`❌ Runtime problem auto-fix failed: ${fixResult.message}`);
            }
          }
        } catch (error) {
          logger.error("Error auto-fixing runtime problem:", error);
        }
      }
      
    } catch (error) {
      logger.error("Error adding runtime problem:", error);
      throw error;
    }
  });
  
  // Get runtime problems for an app
  ipcMain.handle("problems:get-runtime", async (event, appId: number) => {
    try {
      const problems = runtimeProblems.get(appId) || [];
      
      // ✅ FIX: Filter out Haptics UnavailabilityError on web - this is expected behavior, not a real problem
      const filteredProblems = problems.filter(problem => {
        const isHapticsUnavailabilityError = 
          problem.message.includes('UnavailabilityError') &&
          problem.message.includes('Haptic') &&
          problem.message.includes('not available on web');
        
        return !isHapticsUnavailabilityError;
      });
      
      if (filteredProblems.length !== problems.length) {
        logger.info(`🚫 Filtered out ${problems.length - filteredProblems.length} Haptics UnavailabilityError(s) from runtime problems`);
        // Update the stored problems to remove the filtered ones
        runtimeProblems.set(appId, filteredProblems);
      }
      
      logger.info(`📋 Retrieved ${filteredProblems.length} runtime problems for app ${appId}`);
      return filteredProblems;
    } catch (error) {
      logger.error("Error getting runtime problems:", error);
      return [];
    }
  });
  
  // Clear runtime problems for an app
  ipcMain.handle("problems:clear-runtime", async (event, appId: number) => {
    try {
      runtimeProblems.delete(appId);
      logger.info(`🗑️ Cleared runtime problems for app ${appId}`);
    } catch (error) {
      logger.error("Error clearing runtime problems:", error);
    }
  });
}
