import fs from "node:fs";
import path from "node:path";
import { getUserDataPath } from "../paths/paths";
import { UserSettingsSchema, type UserSettings, Secret } from "../lib/schemas";
import { safeStorage } from "electron";
import { v4 as uuidv4 } from "uuid";
import log from "electron-log";
import { DEFAULT_TEMPLATE_ID } from "@/shared/templates";

const logger = log.scope("settings");

// IF YOU NEED TO UPDATE THIS, YOU'RE PROBABLY DOING SOMETHING WRONG!
// Need to maintain backwards compatibility!
const DEFAULT_SETTINGS: UserSettings = {
  selectedModel: {
    name: "auto",
    provider: "auto",
  },
  providerSettings: {},
  telemetryConsent: "unset",
  telemetryUserId: uuidv4(),
  hasRunBefore: false,
  experiments: {},
  enableProLazyEditsMode: false, // Pro feature - disabled by default
  enableProSmartFilesContextMode: false, // Pro feature - disabled by default
  // Spark Features are Pro-only - disabled by default
  enableSparkEditsMode: false,
  enableSparkContextMode: false,
  // SQLite Vector AI is our unique world-first Pro feature
  semanticContextEnabled: false,
  selectedChatMode: "build",
  enableAutoFixProblems: true,
  autoFixModel: {
    name: "qwen2.5-coder:32b",
    provider: "openrouter",
  }, // Use cheaper Qwen model for auto-fix operations
  autoApproveChanges: true,
  enableAutoUpdate: true,
  releaseChannel: "stable",
  selectedTemplateId: DEFAULT_TEMPLATE_ID,
  selectedPlatform: "web", // Default to web platform
  
  // Semantic Context defaults
  semanticCrossAppEnabled: false,
  semanticAutoIndexEnabled: true,
  
  // AI Features Onboarding defaults
  hasShownAIFeaturesDialog: false,
  aiTransformersInstalled: false,

  // Gemini Integration defaults (disabled for Phase 1 rollout)
  enableGemini: false,
  enableGeminiCLI: false,
};

// Use different settings file for packaged apps to avoid loading dev settings
const SETTINGS_FILE = (process.resourcesPath && !process.defaultApp) ? "user-settings-packaged.json" : "user-settings.json";

export function getSettingsFilePath(): string {
  const filePath = path.join(getUserDataPath(), SETTINGS_FILE);
  console.log(`[getSettingsFilePath] Using settings file: ${SETTINGS_FILE}`);
  console.log(`[getSettingsFilePath] Full path: ${filePath}`);
  return filePath;
}

export function readSettings(): UserSettings {
  _readCount++;
  
  // CRITICAL: Prevent recursive calls that cause infinite loops
  if (_isReadingSettings) {
    console.warn('[readSettings] Recursive call detected, returning cached or default settings');
    return _settingsCache || DEFAULT_SETTINGS;
  }
  
  // PERFORMANCE: Use cache if it's still valid (within 5 seconds)
  const now = Date.now();
  if (_settingsCache && (now - _cacheTimestamp) < CACHE_DURATION_MS) {
    _cacheHits++;
    if (_readCount % 50 === 0) { // Log every 50th call to avoid spam
      console.log(`[PERF] Settings cache hit ${_cacheHits}/${_readCount} (${Math.round(_cacheHits/_readCount*100)}% hit rate)`);
    }
    return _settingsCache;
  }
  
  try {
    _isReadingSettings = true;
    const filePath = getSettingsFilePath();
    console.log(`[readSettings] Reading settings from: ${filePath}`);
    console.log(`[readSettings] Environment: NODE_ENV=${process.env.NODE_ENV}, resourcesPath=${process.resourcesPath}, defaultApp=${process.defaultApp}`);
    if (!fs.existsSync(filePath)) {
      console.log(`[readSettings] Settings file doesn't exist, creating default settings`);
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return DEFAULT_SETTINGS;
    }
    const rawSettings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const combinedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
    };
    const supabase = combinedSettings.supabase;
    if (supabase) {
      if (supabase.refreshToken) {
        const encryptionType = supabase.refreshToken.encryptionType;
        if (encryptionType) {
          supabase.refreshToken = {
            value: decrypt(supabase.refreshToken),
            encryptionType,
          };
        }
      }
      if (supabase.accessToken) {
        const encryptionType = supabase.accessToken.encryptionType;
        if (encryptionType) {
          supabase.accessToken = {
            value: decrypt(supabase.accessToken),
            encryptionType,
          };
        }
      }
    }
    const neon = combinedSettings.neon;
    if (neon) {
      if (neon.refreshToken) {
        const encryptionType = neon.refreshToken.encryptionType;
        if (encryptionType) {
          neon.refreshToken = {
            value: decrypt(neon.refreshToken),
            encryptionType,
          };
        }
      }
      if (neon.accessToken) {
        const encryptionType = neon.accessToken.encryptionType;
        if (encryptionType) {
          neon.accessToken = {
            value: decrypt(neon.accessToken),
            encryptionType,
          };
        }
      }
    }
    const gemini = combinedSettings.gemini;
    if (gemini) {
      if (gemini.refreshToken) {
        const encryptionType = gemini.refreshToken.encryptionType;
        if (encryptionType) {
          gemini.refreshToken = {
            value: decrypt(gemini.refreshToken),
            encryptionType,
          };
        }
      }
      if (gemini.accessToken) {
        const encryptionType = gemini.accessToken.encryptionType;
        if (encryptionType) {
          gemini.accessToken = {
            value: decrypt(gemini.accessToken),
            encryptionType,
          };
        }
      }
    }
    if (combinedSettings.githubAccessToken) {
      const encryptionType = combinedSettings.githubAccessToken.encryptionType;
      combinedSettings.githubAccessToken = {
        value: decrypt(combinedSettings.githubAccessToken),
        encryptionType,
      };
    }
    if (combinedSettings.vercelAccessToken) {
      const encryptionType = combinedSettings.vercelAccessToken.encryptionType;
      combinedSettings.vercelAccessToken = {
        value: decrypt(combinedSettings.vercelAccessToken),
        encryptionType,
      };
    }
    for (const provider in combinedSettings.providerSettings) {
      if (combinedSettings.providerSettings[provider].apiKey) {
        console.log(`[readSettings] Found API key for provider: ${provider}`);
        const encryptionType =
          combinedSettings.providerSettings[provider].apiKey.encryptionType;
        combinedSettings.providerSettings[provider].apiKey = {
          value: decrypt(combinedSettings.providerSettings[provider].apiKey),
          encryptionType,
        };
      }
      if (combinedSettings.providerSettings[provider].resourceName) {
        console.log(`[readSettings] Found resource name for provider: ${provider} = ${combinedSettings.providerSettings[provider].resourceName.value}`);
      }
    }

    // Validate and merge with defaults
    const validatedSettings = UserSettingsSchema.parse(combinedSettings);
    
    // Cache the settings to prevent recursive calls AND improve performance
    _settingsCache = validatedSettings;
    _cacheTimestamp = Date.now(); // Update cache timestamp
    
    console.log(`[PERF] Settings loaded from disk (read #${_readCount})`);

    return validatedSettings;
  } catch (error) {
    logger.error("Error reading settings:", error);
    return DEFAULT_SETTINGS;
  } finally {
    // CRITICAL: Always reset the flag to prevent permanent lock
    _isReadingSettings = false;
  }
}

// PERFORMANCE FIX: Aggressive caching to prevent repeated disk I/O
let _isWritingSettings = false;
let _isReadingSettings = false;
let _settingsCache: UserSettings | null = null;
let _cacheTimestamp: number = 0;
const CACHE_DURATION_MS = Infinity; // 🚀 SMART CACHE: Cache indefinitely until settings change

// Performance monitoring
let _readCount = 0;
let _cacheHits = 0;

/**
 * 🚀 SMART CACHE: Invalidate settings cache when settings change
 * Call this whenever settings are modified to ensure fresh reads
 */
export function invalidateSettingsCache() {
  _settingsCache = null;
  _cacheTimestamp = 0;
  logger.info("🔄 Settings cache invalidated - will read fresh from disk on next access");
}

export function writeSettings(settings: Partial<UserSettings>): void {
  // CRITICAL: Prevent recursive calls that cause infinite loops
  if (_isWritingSettings) {
    console.warn('[writeSettings] Recursive call detected, using cached settings');
    return;
  }
  
  try {
    _isWritingSettings = true;
    const filePath = getSettingsFilePath();
    
    // Use cache if available to prevent recursive readSettings calls
    const currentSettings = _settingsCache || readSettings();
    const newSettings = { ...currentSettings, ...settings };
    if (newSettings.githubAccessToken) {
      newSettings.githubAccessToken = encrypt(
        newSettings.githubAccessToken.value,
      );
    }
    if (newSettings.vercelAccessToken) {
      newSettings.vercelAccessToken = encrypt(
        newSettings.vercelAccessToken.value,
      );
    }
    if (newSettings.supabase) {
      if (newSettings.supabase.accessToken) {
        newSettings.supabase.accessToken = encrypt(
          newSettings.supabase.accessToken.value,
        );
      }
      if (newSettings.supabase.refreshToken) {
        newSettings.supabase.refreshToken = encrypt(
          newSettings.supabase.refreshToken.value,
        );
      }
    }
    if (newSettings.neon) {
      if (newSettings.neon.accessToken) {
        newSettings.neon.accessToken = encrypt(
          newSettings.neon.accessToken.value,
        );
      }
      if (newSettings.neon.refreshToken) {
        newSettings.neon.refreshToken = encrypt(
          newSettings.neon.refreshToken.value,
        );
      }
    }
    if (newSettings.gemini) {
      if (newSettings.gemini.accessToken) {
        newSettings.gemini.accessToken = encrypt(
          newSettings.gemini.accessToken.value,
        );
      }
      if (newSettings.gemini.refreshToken) {
        newSettings.gemini.refreshToken = encrypt(
          newSettings.gemini.refreshToken.value,
        );
      }
    }
    for (const provider in newSettings.providerSettings) {
      if (newSettings.providerSettings[provider].apiKey) {
        console.log(`[writeSettings] Encrypting API key for provider: ${provider}`);
        newSettings.providerSettings[provider].apiKey = encrypt(
          newSettings.providerSettings[provider].apiKey.value,
        );
      }
      if (newSettings.providerSettings[provider].resourceName) {
        console.log(`[writeSettings] Saving resource name for provider: ${provider}`);
      }
    }
    const validatedSettings = UserSettingsSchema.parse(newSettings);
    fs.writeFileSync(filePath, JSON.stringify(validatedSettings, null, 2));
    
    // 🚀 SMART CACHE: Invalidate cache after writing to ensure fresh reads
    invalidateSettingsCache();
  } catch (error) {
    logger.error("Error writing settings:", error);
  } finally {
    // CRITICAL: Always reset the flag to prevent permanent lock
    _isWritingSettings = false;
  }
}

export function encrypt(data: string): Secret {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      value: safeStorage.encryptString(data).toString("base64"),
      encryptionType: "electron-safe-storage",
    };
  }
  return {
    value: data,
    encryptionType: "plaintext",
  };
}

export function decrypt(data: Secret): string {
  if (data.encryptionType === "electron-safe-storage") {
    return safeStorage.decryptString(Buffer.from(data.value, "base64"));
  }
  return data.value;
}

// PERFORMANCE: Expose settings performance stats
export function getSettingsPerformanceStats() {
  return {
    totalReads: _readCount,
    cacheHits: _cacheHits,
    hitRate: _readCount > 0 ? Math.round(_cacheHits/_readCount*100) : 0,
    cacheAge: _cacheTimestamp > 0 ? Date.now() - _cacheTimestamp : 0,
    isCacheValid: _settingsCache && (Date.now() - _cacheTimestamp) < CACHE_DURATION_MS
  };
}
