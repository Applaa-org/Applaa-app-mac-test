import { db } from "../../db";

import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateProblemReport } from "../processors/tsc";
import { getDyadAppPath } from "@/paths/paths";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import * as fs from "node:fs";
import * as path from "node:path";

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

      // For Godot apps without TypeScript config, return empty problem report
      if (isGodotApp && !hasTypeScriptConfig) {
        logger.info(`Skipping TypeScript checking for Godot app ${params.appId} (no TypeScript config found)`);
        return { problems: [] };
      }

      // Call autofix with empty full response to just run TypeScript checking
      const problemReport = await generateProblemReport({
        fullResponse: "",
        appPath,
      });

      return problemReport;
    } catch (error) {
      logger.error("Error checking problems:", error);
      throw error;
    }
  });
}
