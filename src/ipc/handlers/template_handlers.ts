import { ipcMain, app } from "electron";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { getAllTemplates } from "../utils/template_utils";
import { localTemplatesData, type Template } from "../../shared/templates";
import fs from "fs";
import path from "path";

const logger = log.scope("template_handlers");
const handle = createLoggedHandler(logger);

export function registerTemplateHandlers() {
  handle("get-templates", async (): Promise<Template[]> => {
    try {
      const templates = await getAllTemplates();
      return templates;
    } catch (error) {
      logger.error("Error fetching templates:", error);
      return localTemplatesData;
    }
  });

  // List template files in a directory (for Minecraft Template Hub)
  ipcMain.handle("template:list-files", async (_, params: { path: string }): Promise<string[]> => {
    try {
      // Get the app root directory
      const appPath = app.isPackaged
        ? path.dirname(app.getPath("exe"))
        : path.resolve(__dirname, "..", "..", "..");

      const templatePath = path.join(appPath, params.path);

      logger.info(`Listing template files in: ${templatePath}`);

      if (!fs.existsSync(templatePath)) {
        logger.warn(`Template path does not exist: ${templatePath}`);
        return [];
      }

      const files = fs.readdirSync(templatePath);
      const mcfunctionFiles = files.filter(f => f.endsWith('.mcfunction'));

      logger.info(`Found ${mcfunctionFiles.length} mcfunction files`);
      return mcfunctionFiles;

    } catch (error) {
      logger.error("Error listing template files:", error);
      return [];
    }
  });

  // Read a template file (for Minecraft Template Hub)
  ipcMain.handle("template:read-file", async (_, params: { path: string }): Promise<string> => {
    try {
      // Get the app root directory
      const appPath = app.isPackaged
        ? path.dirname(app.getPath("exe"))
        : path.resolve(__dirname, "..", "..", "..");

      const templatePath = path.join(appPath, params.path);

      logger.info(`Reading template file: ${templatePath}`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${params.path}`);
      }

      const content = fs.readFileSync(templatePath, 'utf-8');
      return content;

    } catch (error) {
      logger.error("Error reading template file:", error);
      throw error;
    }
  });

  logger.info("✅ Template handlers registered (including file operations)");
}
