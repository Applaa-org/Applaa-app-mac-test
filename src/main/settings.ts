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
const SETTINGS_FILE = (process.resourcesPath || process.defaultApp) ? "user-settings-packaged.json" : "user-settings.json";

export function getSettingsFilePath(): string {
  const filePath = path.join(getUserDataPath(), SETTINGS_FILE);
  console.log(`[getSettingsFilePath] Using settings file: ${SETTINGS_FILE}`);
  console.log(`[getSettingsFilePath] Full path: ${filePath}`);
  return filePath;
}

export function readSettings(): UserSettings {
  try {
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
    }

    // Validate and merge with defaults
    const validatedSettings = UserSettingsSchema.parse(combinedSettings);

    return validatedSettings;
  } catch (error) {
    logger.error("Error reading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Partial<UserSettings>): void {
  try {
    const filePath = getSettingsFilePath();
    const currentSettings = readSettings();
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
        newSettings.providerSettings[provider].apiKey = encrypt(
          newSettings.providerSettings[provider].apiKey.value,
        );
      }
    }
    const validatedSettings = UserSettingsSchema.parse(newSettings);
    fs.writeFileSync(filePath, JSON.stringify(validatedSettings, null, 2));
  } catch (error) {
    logger.error("Error writing settings:", error);
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
