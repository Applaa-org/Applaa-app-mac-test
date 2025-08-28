import { createLoggedHandler } from "./safe_handle";
import { getDyadAppPath } from "../../paths/paths";
import { simpleSpawn } from "../utils/simpleSpawn";
import log from "electron-log";
import fs from "fs";
import path from "path";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";

export const logger = log.scope("flutter_mobile_handlers");
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
    // Legacy DB fallback when columns like display_name are missing
    logger.warn("flutter_mobile_handlers.getApp: falling back to legacy SELECT due to:", err);
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

    if (row.createdAt && typeof row.createdAt === "number") {
      row.createdAt = new Date(row.createdAt * 1000);
    }
    if (row.updatedAt && typeof row.updatedAt === "number") {
      row.updatedAt = new Date(row.updatedAt * 1000);
    }

    row.displayName = undefined;
    row.packageId = undefined;
    row.slug = undefined;

    return row;
  }
}

function isFlutterMobileAppInstalled(appId: number, appPath: string): boolean {
  // Check if a Flutter mobile app exists in the parent directory
  const fullAppPath = getDyadAppPath(appPath);
  const parentDir = path.dirname(fullAppPath);
  const appName = path.basename(fullAppPath);
  
  // Check both possible Flutter folder names (old and new format)
  const flutterMobilePaths = [
    path.join(parentDir, `${appName}-flutter`),           // New format
    path.join(parentDir, `${appName}_flutter_mobile`),    // Old format from previous generation
    path.join(parentDir, `${appName}-flutter-mobile`)     // Alternative format
  ];
  
  // Check if any of the possible Flutter paths exist with required files
  for (const flutterMobilePath of flutterMobilePaths) {
    const pubspecPath = path.join(flutterMobilePath, 'pubspec.yaml');
    const mainDartPath = path.join(flutterMobilePath, 'lib', 'main.dart');
    
    if (fs.existsSync(pubspecPath) && fs.existsSync(mainDartPath)) {
      logger.info(`Flutter mobile app found at: ${flutterMobilePath}`);
      return true;
    }
  }
  
  logger.info(`No Flutter mobile app found for ${appName} in ${parentDir}`);
  return false;
}

export function registerFlutterMobileHandlers() {
  handle(
    "is-flutter-mobile",
    async (_, { appId }: { appId: number }): Promise<boolean> => {
      const app = await getApp(appId);
      const appPath = app.path;
      
      return isFlutterMobileAppInstalled(appId, appPath);
    },
  );

  handle(
    "sync-flutter-mobile",
    async (_, { appId }: { appId: number }): Promise<void> => {
      const app = await getApp(appId);
      const fullAppPath = getDyadAppPath(app.path);
      const parentDir = path.dirname(fullAppPath);
      const appName = path.basename(fullAppPath);
      
      // Find the actual Flutter mobile path (could be in different formats)
      const flutterMobilePaths = [
        path.join(parentDir, `${appName}-flutter`),
        path.join(parentDir, `${appName}_flutter_mobile`),
        path.join(parentDir, `${appName}-flutter-mobile`)
      ];
      
      let flutterMobilePath = null;
      for (const testPath of flutterMobilePaths) {
        if (fs.existsSync(testPath)) {
          flutterMobilePath = testPath;
          break;
        }
      }
      
      if (!flutterMobilePath) {
        throw new Error("Flutter mobile app directory not found");
      }

      if (!isFlutterMobileAppInstalled(appId, app.path)) {
        throw new Error("Flutter mobile app is not installed");
      }

      // Get Flutter dependencies
      await simpleSpawn({
        command: "flutter pub get",
        cwd: flutterMobilePath,
        successMessage: "Flutter dependencies installed successfully",
        errorPrefix: "Failed to install Flutter dependencies",
      });

      // Clean and build
      await simpleSpawn({
        command: "flutter clean",
        cwd: flutterMobilePath,
        successMessage: "Flutter project cleaned successfully",
        errorPrefix: "Failed to clean Flutter project",
      });
    },
  );

  handle(
    "open-flutter-ios",
    async (_, { appId }: { appId: number }): Promise<void> => {
      const app = await getApp(appId);
      const fullAppPath = getDyadAppPath(app.path);
      const parentDir = path.dirname(fullAppPath);
      const appName = path.basename(fullAppPath);
      
      // Find the actual Flutter mobile path (could be in different formats)
      const flutterMobilePaths = [
        path.join(parentDir, `${appName}-flutter`),
        path.join(parentDir, `${appName}_flutter_mobile`),
        path.join(parentDir, `${appName}-flutter-mobile`)
      ];
      
      let flutterMobilePath = null;
      for (const testPath of flutterMobilePaths) {
        if (fs.existsSync(testPath)) {
          flutterMobilePath = testPath;
          break;
        }
      }
      
      if (!flutterMobilePath) {
        throw new Error("Flutter mobile app directory not found");
      }

      if (!isFlutterMobileAppInstalled(appId, app.path)) {
        throw new Error("Flutter mobile app is not installed");
      }

      // Open iOS project in Xcode
      const iosProjectPath = path.join(flutterMobilePath, 'ios', 'Runner.xcworkspace');
      
      await simpleSpawn({
        command: `open "${iosProjectPath}"`,
        cwd: flutterMobilePath,
        successMessage: "Opening Flutter iOS project in Xcode",
        errorPrefix: "Failed to open Flutter iOS project",
      });
    },
  );

  handle(
    "open-flutter-android",
    async (_, { appId }: { appId: number }): Promise<void> => {
      const app = await getApp(appId);
      const fullAppPath = getDyadAppPath(app.path);
      const parentDir = path.dirname(fullAppPath);
      const appName = path.basename(fullAppPath);
      
      // Find the actual Flutter mobile path (could be in different formats)
      const flutterMobilePaths = [
        path.join(parentDir, `${appName}-flutter`),
        path.join(parentDir, `${appName}_flutter_mobile`),
        path.join(parentDir, `${appName}-flutter-mobile`)
      ];
      
      let flutterMobilePath = null;
      for (const testPath of flutterMobilePaths) {
        if (fs.existsSync(testPath)) {
          flutterMobilePath = testPath;
          break;
        }
      }
      
      if (!flutterMobilePath) {
        throw new Error("Flutter mobile app directory not found");
      }

      if (!isFlutterMobileAppInstalled(appId, app.path)) {
        throw new Error("Flutter mobile app is not installed");
      }

      // Open Android project in Android Studio
      const androidProjectPath = path.join(flutterMobilePath, 'android');
      
      await simpleSpawn({
        command: process.platform === 'win32' 
          ? `start "" "${androidProjectPath}"` 
          : process.platform === 'darwin'
          ? `open -a "Android Studio" "${androidProjectPath}"`
          : `studio "${androidProjectPath}"`,
        cwd: flutterMobilePath,
        successMessage: "Opening Flutter Android project in Android Studio",
        errorPrefix: "Failed to open Flutter Android project",
      });
    },
  );
}
