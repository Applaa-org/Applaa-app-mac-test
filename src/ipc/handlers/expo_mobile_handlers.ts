import { createLoggedHandler } from "./safe_handle";
import { getDyadAppPath } from "../../paths/paths";
import { simpleSpawn } from "../utils/simpleSpawn";
import log from "electron-log";
import fs from "fs";
import path from "path";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";

export const logger = log.scope("expo_mobile_handlers");
const handle = createLoggedHandler(logger);

async function getApp(appId: number) {
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });
  if (!app) {
    throw new Error(`App with id ${appId} not found`);
  }
  return app;
}

function isExpoMobileAppInstalled(appId: number, appPath: string): boolean {
  // Check if an Expo mobile app exists in the parent directory
  const parentDir = path.dirname(getDyadAppPath(appPath));
  const appName = path.basename(getDyadAppPath(appPath));
  const expoMobilePath = path.join(parentDir, `${appName}-expo-mobile`);
  
  // Check for Expo app.json and package.json
  const appJsonPath = path.join(expoMobilePath, 'app.json');
  const packageJsonPath = path.join(expoMobilePath, 'package.json');
  
  return fs.existsSync(appJsonPath) && fs.existsSync(packageJsonPath);
}

export function registerExpoMobileHandlers() {
  // Expo mobile handlers removed for MVP
}
