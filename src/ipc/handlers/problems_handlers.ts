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
      try {
        const validator = new CodeValidator(appPath);
        const validationResult = await validator.validate();
        
        // Convert validation problems to the format expected by the UI
        platformProblems = validationResult.problems.map(p => ({
          file: p.file,
          line: p.line || 0,
          column: p.column || 0,
          message: `[${p.category.toUpperCase()}] ${p.message}`,
          severity: p.type === 'error' ? 'error' : 'warning' as const,
          code: p.code || '',
          category: p.category,
          autoFixable: p.autoFixable
        }));
        
        logger.info(`[ProblemsHandler] Found ${platformProblems.length} platform-specific issues`);
      } catch (error) {
        logger.warn(`[ProblemsHandler] Platform validation failed:`, error);
      }

      // 3. Merge both problem sets
      const mergedProblems = [...tscReport.problems, ...platformProblems];
      
      // 4. Auto-fix any auto-fixable platform problems (Scenario B)
      const autoFixableProblems = platformProblems.filter(p => p.autoFixable);
      if (autoFixableProblems.length > 0) {
        logger.info(`[ProblemsHandler] Auto-fixing ${autoFixableProblems.length} platform issues...`);
        try {
          const autoFixer = new AutoFixer(appPath);
          for (const problem of autoFixableProblems) {
            const fixResult = await autoFixer.fixProblem(problem as any);
            if (fixResult.success) {
              logger.info(`[ProblemsHandler] ✅ Auto-fixed: ${problem.message}`);
              // Remove fixed problem from the list
              const index = mergedProblems.findIndex(p => p === problem);
              if (index > -1) {
                mergedProblems.splice(index, 1);
              }
            }
          }
        } catch (error) {
          logger.warn(`[ProblemsHandler] Auto-fix failed:`, error);
        }
      }

      logger.info(`[ProblemsHandler] Total problems: ${mergedProblems.length} (${mergedProblems.filter(p => p.severity === 'error').length} errors)`);

      return {
        ...tscReport,
        problems: mergedProblems,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error("Error checking problems:", error);
      throw error;
    }
  });
}
