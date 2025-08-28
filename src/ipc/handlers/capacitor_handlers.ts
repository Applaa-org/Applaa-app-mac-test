import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import fs from "node:fs";
import path from "node:path";
import { simpleSpawn } from "../utils/simpleSpawn";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("capacitor_handlers");
const handle = createLoggedHandler(logger);

async function getApp(appId: number) {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    if (!app) {
      throw new Error(`App with id ${appId} not found`);
    }
    return app as any;
  } catch (err) {
    // Legacy DB fallback without new columns like display_name
    logger.warn("capacitor_handlers.getApp: falling back to legacy SELECT due to:", err);
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

    if (!row) {
      throw new Error(`App with id ${appId} not found`);
    }

    // Convert legacy timestamps (seconds) to Date
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

function isCapacitorInstalled(appPath: string): boolean {
  const capacitorConfigJs = path.join(appPath, "capacitor.config.js");
  const capacitorConfigTs = path.join(appPath, "capacitor.config.ts");
  const capacitorConfigJson = path.join(appPath, "capacitor.config.json");
  const androidFolder = path.join(appPath, "android");
  const iosFolder = path.join(appPath, "ios");

  // Treat as installed if a config file exists OR native projects exist
  return (
    fs.existsSync(capacitorConfigJs) ||
    fs.existsSync(capacitorConfigTs) ||
    fs.existsSync(capacitorConfigJson) ||
    fs.existsSync(androidFolder) ||
    fs.existsSync(iosFolder)
  );
}

export function registerCapacitorHandlers() {
  handle(
    "is-capacitor",
    async (_, { appId }: { appId: number }): Promise<boolean> => {
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      // check for the required Node.js version before running any commands
      const currentNodeVersion = process.version;
      const majorVersion = parseInt(
        currentNodeVersion.slice(1).split(".")[0],
        10,
      );

      if (majorVersion < 20) {
        // version is too old? stop and throw a clear error
        throw new Error(
          `Capacitor requires Node.js v20 or higher, but you are using ${currentNodeVersion}. Please upgrade your Node.js and try again.`,
        );
      }
      return isCapacitorInstalled(appPath);
    },
  );

  handle(
    "sync-capacitor",
    async (_, { appId }: { appId: number }): Promise<void> => {
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      if (!isCapacitorInstalled(appPath)) {
        throw new Error("Capacitor is not installed in this app");
      }

      await simpleSpawn({
        command: "npm run build",
        cwd: appPath,
        successMessage: "App built successfully",
        errorPrefix: "Failed to build app",
      });

      await simpleSpawn({
        command: "npx cap sync",
        cwd: appPath,
        successMessage: "Capacitor sync completed successfully",
        errorPrefix: "Failed to sync Capacitor",
        env: {
          ...process.env,
          LANG: "en_US.UTF-8",
        },
      });
    },
  );

  handle("open-ios", async (_, { appId }: { appId: number }): Promise<void> => {
    const app = await getApp(appId);
    const appPath = getDyadAppPath(app.path);

    if (!isCapacitorInstalled(appPath)) {
      throw new Error("Capacitor is not installed in this app");
    }

    if (IS_TEST_BUILD) {
      // In test mode, just log the action instead of actually opening Xcode
      logger.info("Test mode: Simulating opening iOS project in Xcode");
      return;
    }

    await simpleSpawn({
      command: "npx cap open ios",
      cwd: appPath,
      successMessage: "iOS project opened successfully",
      errorPrefix: "Failed to open iOS project",
    });
  });

  handle(
    "open-android",
    async (_, { appId }: { appId: number }): Promise<void> => {
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      if (!isCapacitorInstalled(appPath)) {
        throw new Error("Capacitor is not installed in this app");
      }

      if (IS_TEST_BUILD) {
        // In test mode, just log the action instead of actually opening Android Studio
        logger.info(
          "Test mode: Simulating opening Android project in Android Studio",
        );
        return;
      }

      await simpleSpawn({
        command: "npx cap open android",
        cwd: appPath,
        successMessage: "Android project opened successfully",
        errorPrefix: "Failed to open Android project",
      });
    },
  );
}
