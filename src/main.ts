import { app, BrowserWindow, dialog, session } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { registerIpcHandlers } from "./ipc/ipc_host";
import dotenv from "dotenv";
// @ts-ignore
import { initAutoUpdater } from "./main/updater";
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
import { startLocalServer } from "./server/api";
import { initializeSupabase } from "./lib/supabase";

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
      envLoaded = true;
      break;
    }
  } catch {
    // ignore
  }
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  try {
    initializeSupabase({
      url:  'https://pzprgvlutyfqfwmllufm.supabase.co',
      anonKey:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg1MTksImV4cCI6MjA3MjY2NDUxOX0.yKKIL4a6pNwMqKT1iYsmfRXecyR8_4ksyGH-8kxoBWM",
      serviceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cHJndmx1dHlmcWZ3bWxsdWZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODUxOSwiZXhwIjoyMDcyNjY0NTE5fQ.0SfO6KTBztQUMZuZVQkCATZd0B8w2nnAUQcG4c1hMIs"
    });
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

// Register IPC handlers before app is ready
registerIpcHandlers();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup not available in ZIP builds, that's OK
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
  // 🚀 API: Start Local API Server for Buddy Extension
  startLocalServer();

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

  try {
    initializeDatabase();
  } catch (e) {
    logger.error("❌ Failed to initialize database:", e);
    // Re-throw to prevent app from starting with broken database
    throw e;
  }

  // 🚀 PERFORMANCE: Initialize workspace dependency manager for faster app creation
  try {
    const userDataPath = app.getPath("userData");
    const workspaceRoot = path.join(userDataPath, "applaa-workspace");
    await workspaceDependencyManager.initialize(workspaceRoot);
    // Validate container strategy integration (non-blocking)
    try {
      const { validateCoreFunctionality } = await import("./ipc/utils/container_strategy_integration_test");
      await validateCoreFunctionality();
    } catch {
      // non-critical
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
        consent: (settings.analyticsConsent && typeof settings.analyticsConsent === 'object')
          ? settings.analyticsConsent
          : DEFAULT_CONSENT,
      });
    } catch (error) {
      logger.error("❌ Failed to initialize Sentry in main process:", error);
    }
  }

  if (settings.enableAutoUpdate) {
    // 🚀 OTA Updates: Check Applaa-Builder/applaa-releases
    initAutoUpdater();

    const { autoUpdater } = require("electron");

    // Listen for update downloaded
    autoUpdater.on("update-downloaded", (event: any, releaseNotes: any, releaseName: any) => {
      logger.info("Update downloaded, sending message to renderer");
      mainWindow?.webContents.send("update-available", { releaseName });
    });

    // Handle install request
    const { ipcMain } = require("electron");
    ipcMain.handle("update:install", () => {
      logger.info("User requested install, quitting and installing...");
      autoUpdater.quitAndInstall();
    });
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
    show: true,
    center: true,
    // Remove native title bar - app has custom controls
    frame: false,
    titleBarStyle: "hidden",
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
    backgroundColor: "#ffffff",
  });

  // Make mainWindow available globally for IPC handlers
  global.mainWindow = mainWindow;

  // 🍎 Set up custom application menu
  const { Menu, shell } = require('electron');
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Quit Applaa' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'pasteAndMatchStyle', label: 'Paste and Match Style' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Select All' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Fullscreen' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' },
        { type: 'separator' },
        { role: 'reload', label: 'Reload Window' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Applaa',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Applaa',
              message: 'Applaa',
              detail: 'Your local AI app builder with beautiful orange and green design\n\nVersion: 1.0.8'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Applaa Website',
          click: () => shell.openExternal('https://app.applaa.com/')
        },
        {
          label: 'Academy',
          click: () => shell.openExternal('https://applaa.com/academy')
        },
        {
          label: 'Applaa Academy App',
          click: () => shell.openExternal('https://app.applaa.com/applaa-academy/')
        },
        {
          label: 'Community',
          click: () => shell.openExternal('https://app.applaa.com/groups/')
        },
        {
          label: 'Game Hub',
          click: () => shell.openExternal('https://app.applaa.com/games-hub/')
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.applaa.com/')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/Applaa-Builder/applaa/issues')
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // ✅ Handle media permissions for Web Speech API
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(false);
  });

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media';
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
    // In production, the renderer is at .vite/renderer/main_window/index.html
    // Use app.getAppPath() to get the correct base path (works with asar)
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, ".vite", "renderer", "main_window", "index.html");
    mainWindow.loadFile(indexPath);
  }

  // Ensure window is shown when ready
  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Ensure window is shown after loading
  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

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
app.on("window-all-closed", async () => {
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

