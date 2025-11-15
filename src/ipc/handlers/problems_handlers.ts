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
