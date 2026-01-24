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
      console.log('🔧 [IPC] set-user-settings called with:', { 
        hasSelectedModel: !!settings.selectedModel,
        modelProvider: settings.selectedModel?.provider,
        modelName: settings.selectedModel?.name  
      });
      writeSettings(settings);
      const updatedSettings = readSettings();

      // Re-initialize asset generation service with updated settings
      try {
        const assetService = getAssetGenerationService();
        await assetService.init(updatedSettings);
      } catch (error) {
        console.error('Failed to re-initialize asset generation service:', error);
      }

      console.log(' [IPC] Returning updated settings:', { 
        hasSelectedModel: !!updatedSettings.selectedModel,
        modelProvider: updatedSettings.selectedModel?.provider,
        modelName: updatedSettings.selectedModel?.name
      });
      return updatedSettings;
    },
  );

  // 🚀 SMART CACHE: Manual cache invalidation for external changes
  ipcMain.handle("invalidate-settings-cache", async () => {
    invalidateSettingsCache();
    return { success: true };
  });
}
