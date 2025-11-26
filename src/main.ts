import { app, BrowserWindow, dialog, session } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { registerIpcHandlers } from "./ipc/ipc_host";
import dotenv from "dotenv";
// @ts-ignore
import started from "electron-squirrel-startup";
import { updateElectronApp, UpdateSourceType } from "update-electron-app";
import log from "electron-log";
import {
  getSettingsFilePath,
  readSettings,
  writeSettings,
} from "./main/settings";
import { migrateSettingsEncryption, isMigrationNeeded } from "./main/settings-migration";
import { handleSupabaseOAuthReturn } from "./supabase_admin/supabase_return_handler";
import { handleDyadProReturn } from "./main/pro";
import { IS_TEST_BUILD } from "./ipc/utils/test_utils";
import { BackupManager } from "./backup_manager";
import { getDatabasePath, initializeDatabase } from "./db";
import { UserSettings } from "./lib/schemas";
import { handleNeonOAuthReturn } from "./neon_admin/neon_return_handler";
import { bindTerminalWindow } from "./ipc/handlers/terminal_handlers";
import { workspaceDependencyManager } from "./ipc/utils/workspace_dependency_manager";
import { initializeAnalytics, DEFAULT_CONSENT } from "./lib/analytics";

// 🚀 PERFORMANCE: Properly configure electron-log with EPIPE error handling
try {
  // Initialize electron-log properly to avoid "logger isn't initialized" warnings
  log.initialize();
  
  // Configure transports with EPIPE error handling
  log.transports.file.level = 'info';
  log.transports.console.level = 'info';
  log.transports.ipc.level = false; // Disable IPC transport to prevent EPIPE errors
  
  // Add custom error handling for broken pipe errors
  log.errorHandler.startCatching({
    showDialog: false, // Don't show error dialogs for EPIPE errors
    onError: (error: any) => {
      // Ignore EPIPE errors in logging - these are not critical
      if (error?.code === 'EPIPE' || error?.message?.includes('broken pipe')) {
        return false; // Don't handle this error
      }
      return true; // Handle other errors normally
    }
  });
  
} catch (error) {
  console.warn('Failed to initialize electron-log, using console fallback:', error);
}

const logger = log.scope("main");

// Load environment variables from .env file
// Try multiple possible locations for the .env file
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(app.getAppPath(), '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  try {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log('✅ Loaded .env from:', envPath);
      envLoaded = true;
      break;
    }
  } catch (error) {
    console.log('❌ Failed to load .env from:', envPath, error);
  }
}

if (!envLoaded) {
  console.log('⚠️ No .env file found in any of the expected locations');
}

console.log('🚀 App startup - Environment variables status:');
console.log('SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY loaded:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.SUPABASE_URL) {
  console.log('SUPABASE_URL value:', process.env.SUPABASE_URL);
}

// Register IPC handlers before app is ready
registerIpcHandlers();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app#main-process-mainjs
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("applaa", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("applaa");
}

export async function onReady() {
  // ✅ Enable Web Speech API features in Electron with comprehensive flags
  app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI,SpeechRecognition,SpeechSynthesis');
  app.commandLine.appendSwitch('enable-speech-input');
  app.commandLine.appendSwitch('enable-web-speech-api');
  // ✅ Enable media stream for microphone access
  app.commandLine.appendSwitch('enable-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // Auto-grant media permissions
  // ✅ Disable web security only for media permissions (keep other security)
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
  
  try {
    const backupManager = new BackupManager({
      settingsFile: getSettingsFilePath(),
      dbFile: getDatabasePath(),
    });
    await backupManager.initialize();
  } catch (e) {
    logger.error("Error initializing backup manager", e);
  }
  initializeDatabase();

  // 🚀 PERFORMANCE: Initialize workspace dependency manager for faster app creation
  try {
    const userDataPath = app.getPath("userData");
    const workspaceRoot = path.join(userDataPath, "applaa-workspace");
    await workspaceDependencyManager.initialize(workspaceRoot);
    logger.info("🚀 Workspace dependency manager initialized successfully");
    
    // 🔧 INTEGRATION: Validate container strategy integration
    try {
      const { validateCoreFunctionality } = await import("./ipc/utils/container_strategy_integration_test");
      const validationResults = await validateCoreFunctionality();
      logger.info("🧪 Container strategy integration validation:", validationResults);
      
      if (!validationResults.containerStrategy) {
        logger.warn("⚠️ Container strategy integration validation failed - performance optimizations may not work optimally");
      }
    } catch (validationError) {
      logger.warn("⚠️ Container strategy integration validation failed (non-critical):", validationError);
    }
    
  } catch (error) {
    logger.error("❌ Failed to initialize workspace dependency manager:", error);
  }
  
  // 🔄 Auto-migrate settings encryption for seamless updates
  try {
    if (isMigrationNeeded()) {
      logger.info("🔄 Settings migration needed, starting automatic migration...");
      const migrated = await migrateSettingsEncryption();
      if (migrated) {
        logger.info("✅ Settings successfully migrated to stable encryption");
      }
    }
  } catch (error) {
    logger.error("❌ Settings migration failed, but continuing with app startup:", error);
  }
  
  const settings = readSettings();
  await onFirstRunMaybe(settings);
  createWindow();

  // Initialize Sentry in main process if configured
  if (process.env.SENTRY_DSN) {
    try {
      initializeAnalytics({
        sentryDsn: process.env.SENTRY_DSN,
        environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
        userId: settings.userId,
        consent: settings.analyticsConsent || DEFAULT_CONSENT,
      });
      logger.info("✅ Sentry initialized in main process");
    } catch (error) {
      logger.error("❌ Failed to initialize Sentry in main process:", error);
    }
  }

  logger.info("Auto-update enabled=", settings.enableAutoUpdate);
  if (settings.enableAutoUpdate) {
    // Technically we could just pass the releaseChannel directly to the host,
    // but this is more explicit and falls back to stable if there's an unknown
    // release channel.
    const postfix = settings.releaseChannel === "beta" ? "beta" : "stable";
    const host = `https://api.applaa.dev/v1/update/${postfix}`;
    logger.info("Auto-update release channel=", postfix);
    updateElectronApp({
      logger,
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: "dyad-sh/dyad",
        host,
      },
    }); // additional configuration options available
  }
}

export async function onFirstRunMaybe(settings: UserSettings) {
  if (!settings.hasRunBefore) {
    await promptMoveToApplicationsFolder();
    writeSettings({
      hasRunBefore: true,
    });
  }
  if (IS_TEST_BUILD) {
    writeSettings({
      isTestMode: true,
    });
  }
}

/**
 * Ask the user if the app should be moved to the
 * applications folder.
 */
async function promptMoveToApplicationsFolder(): Promise<void> {
  // Why not in e2e tests?
  // There's no way to stub this dialog in time, so we just skip it
  // in e2e testing mode.
  if (IS_TEST_BUILD) return;
  if (process.platform !== "darwin") return;
  if (app.isInApplicationsFolder()) return;
  logger.log("Prompting user to move to applications folder");

  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Move to Applications Folder", "Do Not Move"],
    defaultId: 0,
    message: "Move to Applications Folder? (required for auto-update)",
  });

  if (response === 0) {
    logger.log("User chose to move to applications folder");
    app.moveToApplicationsFolder();
  } else {
    logger.log("User chose not to move to applications folder");
  }
}

declare global {
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  var mainWindow: BrowserWindow | null;
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: process.env.NODE_ENV === "development" ? 1280 : 960,
    height: 700,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    trafficLightPosition: {
      x: 10,
      y: 8,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true, // ✅ Enable Electron's built-in spell checker
      // ✅ Security settings
      allowRunningInsecureContent: false,
      webSecurity: true,
      // ✅ Remove experimentalFeatures to fix security warning
      // experimentalFeatures: true, // Not needed for voice input
      // transparent: true,
    },
    // backgroundColor: "#00000001",
    // frame: false,
  });
  
  // Make mainWindow available globally for IPC handlers
  global.mainWindow = mainWindow;
  
  // ✅ Handle media permissions for Web Speech API
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow media permissions for speech recognition
    if (permission === 'media') {
      console.log('🎵 Media permission requested - granting access for voice input');
      callback(true);
      return;
    }
    
    // Deny other permissions by default for security
    console.log(`🚫 Permission denied: ${permission}`);
    callback(false);
  });

  // ✅ Handle permission checks for Web Speech API
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    // Allow media permissions for speech recognition
    if (permission === 'media') {
      console.log('🎵 Media permission check - allowing for voice input');
      return true;
    }
    
    // Deny other permissions by default
    return false;
  });

  // 🚀 COOP/COEP headers for WASM threads/WebGPU support (Whisper optimization)
  // Only apply in production to avoid blob URL issues in development
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Add COOP/COEP headers only in production
    if (process.env.NODE_ENV === 'production') {
      responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
      responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
    }
    
    callback({ responseHeaders });
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 COOP/COEP headers disabled in development to allow blob URLs for WASM');
  }
  
  // Bind terminal window for terminal handlers
  bindTerminalWindow(mainWindow);
  
  // ✅ Set spell checker language to English US
  mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);
  
  // ✅ Register global keyboard shortcut for voice input (Ctrl+Shift+V)
  const { globalShortcut } = require('electron');
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send event to renderer to trigger voice input
      mainWindow.webContents.send('trigger-voice-input');
    }
  });
  
  // ✅ Handle spell check context menu (per Electron docs)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => mainWindow?.webContents.replaceMisspelling(suggestion)
      }));
    }

    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () => mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      );
    }

    // Add separator and standard context menu items if there are suggestions
    if (params.dictionarySuggestions.length > 0 || params.misspelledWord) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Add standard editing options
    if (params.isEditable) {
      if (params.selectionText) {
        menu.append(new MenuItem({
          label: 'Cut',
          role: 'cut'
        }));
        menu.append(new MenuItem({
          label: 'Copy',
          role: 'copy'
        }));
      }
      menu.append(new MenuItem({
        label: 'Paste',
        role: 'paste'
      }));
      menu.append(new MenuItem({
        label: 'Select All',
        role: 'selectall'
      }));
    }

    // Only show the menu if there are items
    if (menu.items.length > 0) {
      menu.popup();
    }
  });
  
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../renderer/main_window/index.html"),
    );
  }
  // Developer tools can be opened manually with Ctrl+Shift+I or F12
  // if (process.env.NODE_ENV === "development") {
  //   // Open the DevTools.
  //   mainWindow.webContents.openDevTools();
  // }
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't get the lock, quit the app
  // The existing instance will handle the deep link
  logger.info("Another instance is already running, quitting this instance");
  app.quit();
} else {
  // We got the lock, so this is the main instance
  logger.info("Got single instance lock, this is the main instance");
  app.whenReady().then(onReady);
  
  // Handle the protocol when the app is already running
  app.on("open-url", (event, url) => {
    event.preventDefault(); // Prevent opening a new window
    logger.info("Deep link received in main instance:", url);
    handleDeepLinkReturn(url);
  });

  // Handle when someone tries to run a second instance
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    logger.info("Second instance attempted, focusing existing window");
    
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
    
    // Check if there's a deep link in the command line
    const deepLink = commandLine.find(arg => arg.startsWith('applaa://'));
    if (deepLink) {
      logger.info("Deep link from second instance:", deepLink);
      handleDeepLinkReturn(deepLink);
    }
  });
}

function handleDeepLinkReturn(url: string) {
  // example url: "dyad://supabase-oauth-return?token=a&refreshToken=b"
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    log.info("Invalid deep link URL", url);
    return;
  }

  // Intentionally do NOT log the full URL which may contain sensitive tokens.
  log.log(
    "Handling deep link: protocol",
    parsed.protocol,
    "hostname",
    parsed.hostname,
  );
  if (parsed.protocol !== "dyad:" && parsed.protocol !== "applaa:") {
    dialog.showErrorBox(
      "Invalid Protocol",
      `Expected dyad:// or applaa://, got ${parsed.protocol}. Full URL: ${url}`,
    );
    return;
  }
  if (parsed.hostname === "neon-oauth-return") {
    const token = parsed.searchParams.get("token");
    const refreshToken = parsed.searchParams.get("refreshToken");
    const expiresIn = Number(parsed.searchParams.get("expiresIn"));
    if (!token || !refreshToken || !expiresIn) {
      dialog.showErrorBox(
        "Invalid URL",
        "Expected token, refreshToken, and expiresIn",
      );
      return;
    }
    handleNeonOAuthReturn({ token, refreshToken, expiresIn });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  if (parsed.hostname === "supabase-oauth-return") {
    const token = parsed.searchParams.get("token");
    const refreshToken = parsed.searchParams.get("refreshToken");
    const expiresIn = Number(parsed.searchParams.get("expiresIn"));
    if (!token || !refreshToken || !expiresIn) {
      dialog.showErrorBox(
        "Invalid URL",
        "Expected token, refreshToken, and expiresIn",
      );
      return;
    }
    handleSupabaseOAuthReturn({ token, refreshToken, expiresIn });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  // dyad://dyad-pro-return?key=123&budget_reset_at=2025-05-26T16:31:13.492000Z&max_budget=100
  if (parsed.hostname === "dyad-pro-return") {
    const apiKey = parsed.searchParams.get("key");
    if (!apiKey) {
      dialog.showErrorBox("Invalid URL", "Expected key");
      return;
    }
    handleDyadProReturn({
      apiKey,
    });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  
  // Handle Google OAuth callback: applaa://auth-callback#access_token=...&refresh_token=...
  if (parsed.hostname === "auth-callback") {
    logger.info("Handling Google OAuth callback");
    logger.info("Main window exists:", !!mainWindow);
    logger.info("App is in development mode:", process.env.NODE_ENV === "development");
    
    // Extract tokens from URL fragment (after #)
    const fragment = parsed.hash.substring(1); // Remove the #
    const params = new URLSearchParams(fragment);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    
    if (!accessToken || !refreshToken) {
      dialog.showErrorBox(
        "OAuth Error",
        "Missing access token or refresh token in callback URL"
      );
      return;
    }
    
    // Focus the existing window instead of opening a new one
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
    }
    
    // Send the tokens to the renderer process to complete the OAuth flow
    mainWindow?.webContents.send("oauth-callback", {
      accessToken,
      refreshToken,
      expiresIn: expiresIn ? parseInt(expiresIn) : 3600,
    });
    
    logger.info("OAuth callback processed successfully");
    return;
  }
  
  dialog.showErrorBox("Invalid deep link URL", url);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // ✅ Cleanup global shortcuts
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
