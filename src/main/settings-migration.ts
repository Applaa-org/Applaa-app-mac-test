/**
 * 🔄 Settings Migration Utility
 * 
 * This utility helps migrate user settings from old encryption methods
 * to the new stable encryption system that persists across app updates.
 */

import log from "electron-log";
import { readSettings, writeSettings, encrypt, decrypt } from "./settings";
import { Secret } from "../lib/schemas";

const logger = log.scope("settings-migration");

/**
 * Migrate settings from old encryption to new stable encryption
 */
export async function migrateSettingsEncryption(): Promise<boolean> {
  try {
    logger.info("🔄 Starting settings encryption migration...");
    
    const settings = readSettings();
    let migrationNeeded = false;
    let migratedCount = 0;
    
    // Check if any settings use old encryption methods
    const checkAndMigrate = (secretData: Secret | undefined, fieldName: string): Secret | undefined => {
      if (!secretData) return undefined;
      
      if (secretData.encryptionType === "electron-safe-storage") {
        logger.info(`📦 Migrating ${fieldName} from electron-safe-storage to stable encryption`);
        try {
          // Decrypt with old method
          const decryptedValue = decrypt(secretData);
          // Re-encrypt with new stable method
          const newEncrypted = encrypt(decryptedValue);
          migrationNeeded = true;
          migratedCount++;
          return newEncrypted;
        } catch (error) {
          logger.error(`❌ Failed to migrate ${fieldName}:`, error);
          return secretData; // Keep original if migration fails
        }
      }
      
      return secretData;
    };
    
    // Migrate provider settings (API keys, etc.)
    const newProviderSettings = { ...settings.providerSettings };
    for (const provider in newProviderSettings) {
      if (newProviderSettings[provider].apiKey) {
        const migrated = checkAndMigrate(newProviderSettings[provider].apiKey, `${provider} API key`);
        if (migrated) {
          newProviderSettings[provider].apiKey = migrated;
        }
      }
    }
    
    // Migrate other encrypted fields
    const newSettings = {
      ...settings,
      providerSettings: newProviderSettings,
      githubAccessToken: checkAndMigrate(settings.githubAccessToken, "GitHub access token"),
      vercelAccessToken: checkAndMigrate(settings.vercelAccessToken, "Vercel access token"),
    };
    
    // Migrate Supabase tokens
    if (settings.supabase) {
      newSettings.supabase = {
        ...settings.supabase,
        accessToken: checkAndMigrate(settings.supabase.accessToken, "Supabase access token"),
        refreshToken: checkAndMigrate(settings.supabase.refreshToken, "Supabase refresh token"),
      };
    }
    
    // Migrate Neon tokens
    if (settings.neon) {
      newSettings.neon = {
        ...settings.neon,
        accessToken: checkAndMigrate(settings.neon.accessToken, "Neon access token"),
        refreshToken: checkAndMigrate(settings.neon.refreshToken, "Neon refresh token"),
      };
    }
    
    // Migrate Gemini tokens
    if (settings.gemini) {
      newSettings.gemini = {
        ...settings.gemini,
        accessToken: checkAndMigrate(settings.gemini.accessToken, "Gemini access token"),
        refreshToken: checkAndMigrate(settings.gemini.refreshToken, "Gemini refresh token"),
      };
    }
    
    if (migrationNeeded) {
      logger.info(`✅ Migrated ${migratedCount} encrypted fields to stable encryption`);
      writeSettings(newSettings);
      logger.info("💾 Migration completed successfully");
      return true;
    } else {
      logger.info("✨ No migration needed - all settings already use stable encryption");
      return false;
    }
    
  } catch (error) {
    logger.error("❌ Settings migration failed:", error);
    return false;
  }
}

/**
 * Check if settings migration is needed
 */
export function isMigrationNeeded(): boolean {
  try {
    const settings = readSettings();
    
    // Check provider settings
    for (const provider in settings.providerSettings) {
      if (settings.providerSettings[provider].apiKey?.encryptionType === "electron-safe-storage") {
        return true;
      }
    }
    
    // Check other encrypted fields
    const fieldsToCheck = [
      settings.githubAccessToken,
      settings.vercelAccessToken,
      settings.supabase?.accessToken,
      settings.supabase?.refreshToken,
      settings.neon?.accessToken,
      settings.neon?.refreshToken,
      settings.gemini?.accessToken,
      settings.gemini?.refreshToken,
    ];
    
    return fieldsToCheck.some(field => field?.encryptionType === "electron-safe-storage");
    
  } catch (error) {
    logger.error("Failed to check migration status:", error);
    return false;
  }
}

/**
 * Get migration status information
 */
export function getMigrationStatus() {
  const settings = readSettings();
  let totalEncrypted = 0;
  let stableEncrypted = 0;
  let legacyEncrypted = 0;
  
  const checkField = (field: Secret | undefined) => {
    if (!field) return;
    totalEncrypted++;
    if (field.encryptionType === "applaa-stable-v1") {
      stableEncrypted++;
    } else if (field.encryptionType === "electron-safe-storage") {
      legacyEncrypted++;
    }
  };
  
  // Check all encrypted fields
  for (const provider in settings.providerSettings) {
    checkField(settings.providerSettings[provider].apiKey);
  }
  
  checkField(settings.githubAccessToken);
  checkField(settings.vercelAccessToken);
  checkField(settings.supabase?.accessToken);
  checkField(settings.supabase?.refreshToken);
  checkField(settings.neon?.accessToken);
  checkField(settings.neon?.refreshToken);
  checkField(settings.gemini?.accessToken);
  checkField(settings.gemini?.refreshToken);
  
  return {
    totalEncrypted,
    stableEncrypted,
    legacyEncrypted,
    migrationNeeded: legacyEncrypted > 0,
    migrationProgress: totalEncrypted > 0 ? (stableEncrypted / totalEncrypted) * 100 : 100,
  };
}
