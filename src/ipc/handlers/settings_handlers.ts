import { ipcMain } from "electron";
import type { UserSettings } from "../../lib/schemas";
import { writeSettings, invalidateSettingsCache } from "../../main/settings";
import { readSettings } from "../../main/settings";
import { getAssetGenerationService } from "@/services/asset-generation/asset-service";

export function registerSettingsHandlers() {
  // Intentionally do NOT use handle because it could log sensitive data from the return value.
  ipcMain.handle("get-user-settings", async () => {
    const settings = readSettings();

    // Initialize asset generation service with settings
    try {
      const assetService = getAssetGenerationService();
      await assetService.init(settings);
    } catch (error) {
      console.error('Failed to initialize asset generation service:', error);
    }

    return settings;
  });

  // Intentionally do NOT use handle because it could log sensitive data from the args.
  ipcMain.handle(
    "set-user-settings",
    async (_, settings: Partial<UserSettings>) => {
      writeSettings(settings);
      const updatedSettings = readSettings();

      // Re-initialize asset generation service with updated settings
      try {
        const assetService = getAssetGenerationService();
        await assetService.init(updatedSettings);
      } catch (error) {
        console.error('Failed to re-initialize asset generation service:', error);
      }

      return updatedSettings;
    },
  );

  // 🚀 SMART CACHE: Manual cache invalidation for external changes
  ipcMain.handle("invalidate-settings-cache", async () => {
    invalidateSettingsCache();
    return { success: true };
  });
}
