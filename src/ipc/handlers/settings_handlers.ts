import { ipcMain } from "electron";
import type { UserSettings } from "../../lib/schemas";
import { writeSettings, invalidateSettingsCache } from "../../main/settings";
import { readSettings } from "../../main/settings";

export function registerSettingsHandlers() {
  // Intentionally do NOT use handle because it could log sensitive data from the return value.
  ipcMain.handle("get-user-settings", async () => {
    const settings = readSettings();
    return settings;
  });

  // Intentionally do NOT use handle because it could log sensitive data from the args.
  ipcMain.handle(
    "set-user-settings",
    async (_, settings: Partial<UserSettings>) => {
      writeSettings(settings);
      return readSettings();
    },
  );

  // 🚀 SMART CACHE: Manual cache invalidation for external changes
  ipcMain.handle("invalidate-settings-cache", async () => {
    invalidateSettingsCache();
    return { success: true };
  });
}
