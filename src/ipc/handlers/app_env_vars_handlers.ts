/**
 * DO NOT USE LOGGER HERE.
 * Environment variables are sensitive and should not be logged.
 */
import { ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { GetAppEnvVarsParams, SetAppEnvVarsParams } from "../ipc_types";
import {
  ENV_FILE_NAME,
  parseEnvFile,
  serializeEnvFile,
} from "../utils/app_env_var_utils";

// Helper function for legacy-safe app queries
async function getAppSafe(appId: number): Promise<any> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    return app as any;
  } catch (err) {
    console.warn("app_env_vars_handlers.getAppSafe: falling back to legacy SELECT due to:", err);
    const row = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, updated_at as updatedAt, " +
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

export function registerAppEnvVarsHandlers() {
  // Handler to get app environment variables
  ipcMain.handle(
    "get-app-env-vars",
    async (event, { appId }: GetAppEnvVarsParams) => {
      try {
        const app = await getAppSafe(appId);

        if (!app) {
          throw new Error("App not found");
        }

        const appPath = getDyadAppPath(app.path);
        const envFilePath = path.join(appPath, ENV_FILE_NAME);

        // If .env.local doesn't exist, return empty array
        try {
          await fs.promises.access(envFilePath);
        } catch {
          return [];
        }

        const content = await fs.promises.readFile(envFilePath, "utf8");
        const envVars = parseEnvFile(content);

        return envVars;
      } catch (error) {
        console.error("Error getting app environment variables:", error);
        throw new Error(
          `Failed to get environment variables: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  // Handler to set app environment variables
  ipcMain.handle(
    "set-app-env-vars",
    async (event, { appId, envVars }: SetAppEnvVarsParams) => {
      try {
        const app = await getAppSafe(appId);

        if (!app) {
          throw new Error("App not found");
        }

        const appPath = getDyadAppPath(app.path);
        const envFilePath = path.join(appPath, ENV_FILE_NAME);

        // Serialize environment variables to .env.local format
        const content = serializeEnvFile(envVars);

        // Write to .env.local file
        await fs.promises.writeFile(envFilePath, content, "utf8");
      } catch (error) {
        console.error("Error setting app environment variables:", error);
        throw new Error(
          `Failed to set environment variables: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );
}
