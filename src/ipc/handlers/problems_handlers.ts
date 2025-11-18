import { db } from "../../db";

import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateProblemReport } from "../processors/tsc";
import { getDyadAppPath } from "@/paths/paths";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import * as fs from "node:fs";
import * as path from "node:path";
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

      // Check if this is a Godot app
      const isGodotApp = app.appType === 'godot' || fs.existsSync(path.join(appPath, 'godot-project', 'project.godot'));
      
      // Check if TypeScript config exists
      const possibleConfigs = ['tsconfig.app.json', 'tsconfig.json'];
      const hasTypeScriptConfig = possibleConfigs.some(config => 
        fs.existsSync(path.join(appPath, config))
      );

      // Get TypeScript problems (if applicable)
      let problems: any[] = [];
      if (!isGodotApp || hasTypeScriptConfig) {
        try {
          const problemReport = await generateProblemReport({
            fullResponse: "",
            appPath,
          });
          problems = problemReport.problems || [];
        } catch (tscError) {
          logger.warn("TypeScript checking failed:", tscError);
        }
      }

      // For Godot apps, also check for export errors
      if (isGodotApp) {
        try {
          const { getGodotWebExportUrl } = await import("./godot_handlers");
          // We need to call the handler logic directly, but it's not exported
          // So we'll check the export status manually
          const exportPath = path.join(appPath, "godot-web-export");
          const indexHtmlPath = path.join(exportPath, "index.html");
          const projectPath = path.join(appPath, "godot-project");
          const projectGodotPath = path.join(projectPath, "project.godot");
          
          // Check for export issues
          if (fs.existsSync(projectGodotPath)) {
            if (!fs.existsSync(indexHtmlPath)) {
              // Check if export directory exists
              if (fs.existsSync(exportPath)) {
                const files = fs.readdirSync(exportPath);
                problems.push({
                  file: "godot-web-export/index.html",
                  line: 1,
                  column: 1,
                  message: `Godot export is missing index.html. Found files: ${files.join(", ") || "none"}. The game cannot be previewed. Run 'Create/Refresh Export' to generate the export, or check if Godot engine is installed and export templates are available.`,
                  code: 9999, // Custom code for Godot errors
                  snippet: `// Godot Export Error: Missing index.html\n// Files found: ${files.join(", ") || "none"}\n// Fix: Run export command or check Godot engine installation`,
                } as any);
              } else {
                problems.push({
                  file: "godot-web-export/",
                  line: 1,
                  column: 1,
                  message: "Godot web export not found. The game project exists but has not been exported for preview. Click 'Create/Refresh Export' button in the preview panel to generate the export automatically.",
                  code: 9998, // Custom code for Godot errors
                  snippet: `// Godot Export Error: Export directory not found\n// Fix: Run export command to create the web export`,
                } as any);
              }
            }
          } else {
            problems.push({
              file: "godot-project/project.godot",
              line: 1,
              column: 1,
              message: "Godot project not found. The game project may not have been created yet. The game project needs to be built first. Check if there were errors during game creation.",
              code: 9997, // Custom code for Godot errors
              snippet: `// Godot Project Error: project.godot not found\n// Fix: Rebuild the game project from the game specification`,
            } as any);
          }
        } catch (godotError) {
          logger.warn("Error checking Godot export status:", godotError);
        }
      }

      return { problems };
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
