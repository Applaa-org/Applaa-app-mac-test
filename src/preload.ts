// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Whitelist of valid channels
const validInvokeChannels = [
  "get-language-models",
  "get-language-models-by-providers",
  "create-custom-language-model",
  "get-language-model-providers",
  "delete-custom-language-model-provider",
  "create-custom-language-model-provider",
  "delete-custom-language-model",
  "delete-custom-model",
  "chat:add-dep",
  "chat:message",
  "chat:cancel",
  "chat:stream",
  "chat:stream-autofix",
  "performance:get-report",
  "performance:get-metrics",
  "performance:clear",
  "performance:log-report",
  "chat:count-tokens",
  "speech:start-native",
  "speech:stop-native",
  "speech:check-native-support",
  "create-chat",
  "create-app",
  "copy-app",
  "get-chat",
  "get-chats",
  "get-chat-logs",
  "console-db-data",
  "sync-all-apps-to-supabase",
  "test-sync-single-app",
  "test-sync-single-app-direct",
  "verify-app-in-supabase",
  "list-apps-in-supabase",
  "test-supabase-connection",
  "list-apps",
  "get-app",
  "get-app-env-vars",
  "set-app-env-vars",
  "edit-app-file",
  "read-app-file",
  "run-app",
  "stop-app",
  "restart-app",
  "respond-to-app-input",
  "list-versions",
  "revert-version",
  "checkout-version",
  "get-current-branch",
  "delete-app",
  "rename-app",
  "app:update-deployment-urls",
  "get-user-settings",
  "set-user-settings",
  "get-env-vars",
  "open-external-url",
  "show-item-in-folder",
  "reset-all",
  "nodejs-status",
  "install-node",
  "github:start-flow",
  "github:list-repos",
  "github:get-repo-branches",
  "github:is-repo-available",
  "github:create-repo",
  "github:connect-existing-repo",
  "github:push",
  "github:disconnect",
  "github:auto-push",
  "neon:create-project",
  "neon:get-project",
  "neon:delete-branch",
  "vercel:save-token",
  "vercel:list-projects",
  "vercel:is-project-available",
  "vercel:create-project",
  "vercel:connect-existing-project",
  "vercel:get-deployments",
  "vercel:disconnect",
  "vercel:deploy",
  "vercel:get-deployment-status",
  "get-app-version",
  "reload-env-path",
  "get-proposal",
  "approve-proposal",
  "reject-proposal",
  "get-system-debug-info",
  "supabase:list-projects",
  "supabase:set-app-project",
  "supabase:unset-app-project",
  // Supabase Authentication
  "supabase:initialize",
  "supabase:initialize-from-settings",
  "supabase:sign-up",
  "supabase:sign-in",
  "supabase:sign-in-with-username-or-email",
  "supabase:sign-out",
  "supabase:get-current-user",
  "supabase:get-current-session",
  "supabase:reset-password",
  "supabase:update-password",
  "supabase:update-profile",
  "supabase:is-authenticated",
  "supabase:save-credentials",
  "supabase:check-configuration",
  "supabase:sign-in-with-google",
  "supabase:set-session",
  // Subscription Management
  "subscription:initialize",
  "subscription:initialize-from-settings",
  "subscription:get-current",
  "subscription:create-checkout",
  "subscription:create-portal",
  "subscription:cancel",
  "subscription:resume",
  "subscription:webhook",
  "subscription:redirect-to-subscribe",
  "subscription:sync-from-supabase",
  // Profile Management
  "profile:get-current",
  "profile:update",
  // Credit Management
  "credit:check",
  "credit:deduct",
  "credit:get-balance",
  "credit:get-token-usage-summary",
  "credit:get-usage",
  "credit:reset",
  "credit:check-reset",
  "credit:top-up",
  "wordpress:check-configuration",
  "wordpress:login",
  "wordpress:register",
  "wordpress:logout",
  "wordpress:get-current-user",
  "wordpress:check-capability",
  "wordpress:check-admin-permission",
  "wordpress:validate-session",
  "wordpress:oauth-login",
  "shell:open-external",
  "oauth-callback",
  "local-models:list-ollama",
  "local-models:list-lmstudio",
  "window:minimize",
  "window:maximize",
  "window:close",
  "get-system-platform",
  "upload-to-signed-url",
  "delete-chat",
  "update-chat",
  "delete-messages",
  "start-chat-stream",
  "does-release-note-exist",
  "import-app",
  "check-ai-rules",
  "select-app-folder",
  "clone-website",
  "select-directory",
  "get-apps-base-path",
  "check-app-name",
  "rename-branch",
  "clear-session-data",
  "get-user-budget",
  "get-context-paths",
  "set-context-paths",
  "get-app-upgrades",
  "execute-app-upgrade",
  "is-capacitor",
  "sync-capacitor",
  "open-ios",
  "open-android",
  "is-flutter-mobile",
  "sync-flutter-mobile",
  "open-flutter-ios",
  "open-flutter-android",
  "check-problems",
  "restart-dyad",
  "get-templates",
  "portal:migrate-create",
  "expo:start",
  "expo:stop",
  "expo:status",
  "expo:health-check",
  "expo:trigger-reload",
  // Expo maintenance/reset
  "expo:reset",
  // Simple Expo channels (RORK-style lightweight preview)
  "simple-expo:start",
  "simple-expo:status",
  "simple-expo:stop",
  "simple-expo:metro-recovery",
  "simple-expo:update-packages",

  // Sandbox Metro channels (True OS-independent preview)
  "sandbox-metro:start",
  "sandbox-metro:stop",
  "sandbox-metro:status",

  // Snack Preview channels (Hot Reload & File Watching)
  "snack:start-hot-reload",
  "snack:stop-hot-reload",
  "snack:is-watching",
  "snack:get-watched-apps",
  "snack:manual-trigger",
  "snack:update-options",
  "snack:get-options",

  // Code Validation channels
  "code:validate",
  "code:auto-fix",
  "code:auto-fix-all",
  "code:validate-and-fix",
  "chrome-devtools:start",
  "chrome-devtools:stop",
  "chrome-devtools:navigate",
  "chrome-devtools:console-messages",
  "chrome-devtools:network-requests",
  "chrome-devtools:screenshot",
  "chrome-devtools:status",
  "app:repair",
  "app:check-repair-needed",
  "problems:add-runtime",
  "problems:get-runtime",
  "problems:clear-runtime",

  // Design Generation
  "generate-app-icons",
  "generate-gemini-icons",
  "generate-platform-icons",
  "generate-ui-designs",
  "generate-app-type-designs",
  "apply-icon-to-app",
  "apply-ui-design-to-app",
  "simple-expo:input",
  // Parallel App Creation channels
  "create-app-instant",
  "get-app-creation-status",
  "cleanup-app-creation-task",
  "prompt:optimize",
  "prompts:list",
  "prompts:create",
  "prompts:update",
  "prompts:delete",
  "prompts:seed",
  // Terminal channels
  "terminal:execute",
  "terminal:stop",
  "terminal:status",
  "terminal:clear",
  // Expo Snack preview (auto-preview)

  // Semantic Context channels
  "semantic-context:get-suggestions",
  "semantic-context:index-app",
  "semantic-context:update-file",
  "semantic-context:delete-file",
  "semantic-context:delete-app",
  "semantic-context:record-feedback",
  "semantic-context:get-analytics",
  "semantic-context:is-app-indexed",
  "semantic-context:get-file-count",
  "semantic-context:initialize",

  // AI Features Installation channels
  "install-ai-transformers",
  "check-ai-transformers-installed",

  // Flutter IPC channels
  "flutter:doctor",
  "flutter:check-sdk",
  "flutter:get-version",
  "flutter:install-sdk",
  "flutter:is-in-path",
  "flutter:get-path",
  "flutter:validate-environment",
  "flutter:create-project",
  "flutter:validate-project",
  "flutter:get-dependencies",

  // Playwright MCP channels
  "playwright-mcp:start-server",
  "playwright-mcp:stop-server",
  "playwright-mcp:run-test",
  "playwright-mcp:status",

  // Professional Chromium Browser channels
  "chromium:launch",
  "chromium:init-view",
  "chromium:set-bounds",
  "chromium:create-tab",
  "chromium:close-tab",
  "chromium:switch-tab",
  "chromium:navigate",
  "chromium:go-back",
  "chromium:go-forward",
  "chromium:reload",
  "chromium:get-all-tabs",
  "chromium:get-tab-info",
  "chromium:close",
  "chromium:hide-view",

  // 🤖 Applaa Buddy - AI Assistant Browser channels
  "buddy:launch",
  "buddy:close",
  "buddy:status",

  // 🤖 Gemini AI Browser Automation channels
  "automation:init",
  "automation:plan",
  "automation:transcribe",
  "automation:execute",
  "automation:execute",
  "automation:extract",

  // Gemini CLI Authentication channels
  "gemini-oauth-login",
  "gemini-auth-status",
  "gemini-auth-refresh",
  "gemini-auth-logout",
  "gemini-run-prompt",

  // Gemini API channels
  "gemini-list-models",
  "gemini-complete",
  "gemini-complete-stream",
  "gemini-health-check",
  // Hermetic Runtime Management
  "hermetic-runtime:verify",
  "hermetic-runtime:get-package-manager",
  "hermetic-runtime:ensure-pnpm",
  // Background task channels
  "background-tasks:list",
  "background-tasks:get",
  "background-tasks:cancel",
  "background-tasks:cleanup",
  "background-tasks:running-count",
  "create-app-background",

  // Terminal channels
  "terminal:create",

  // Test-only channels
  // These should ALWAYS be guarded with IS_TEST_BUILD in the main process.
  // We can't detect with IS_TEST_BUILD in the preload script because
  // it's a separate process from the main process.
  "supabase:fake-connect-and-set-project",

  // EAS Integration channels
  "eas:status",
  "eas:login",
  "eas:login-token",
  "eas:build",
  "eas:deploy",
  "eas:build-status",
  "eas:list-projects",
  "eas:check-app-readiness",
  "eas:check-keystores",
  "eas:setup-keystores",
  "url:save-deployment",
  "url:get-deployments",
  "url:delete-deployment",
  "local-build:android-apk",
  "local-build:android-aab",
  "local-build:ios-ipa",
  "local-build:status",
  "local-build:cancel",
  "android:check-dependencies",
  "android:get-installation-instructions",
  "ios:check-dependencies",
  "build:check-all-dependencies",
  "auto-installer:install-android",
  "auto-installer:install-ios",
  "prerequisites:check",
  "prerequisites:install",
  "prerequisites:status",
  "prerequisites:progress",
  // Godot Engine channels
  "godot:generate-game-spec",
  "godot:build-from-spec",
  "godot:create-project",
  "godot:export-web",
  "godot:get-project-status",
  "godot:get-web-export-url",
  "godot:stop-server",
  "godot:check-engine",
  // Games Management channels
  "games:list",
  "games:create",
  "games:update",
  "games:delete",
  "games:increment-view",
  "games:toggle-like",
  "games:test-image-url",
  "games:test-all-images",
  // Game Templates Management channels
  "game-templates:list",
  "game-templates:create",
  "game-templates:update",
  "game-templates:delete",
  "game-templates:search",
  "game-templates:get-by-category",

  // 🧠 Local Brain channels
  "local-brain:search",
  "local-brain:embed",
  "local-brain:init",

  // 🧠 Skill Executor
  "skill:execute",
  "skill:status",

  // Web Apps Templates Management channels
  "web-apps:list",

  // Applaa AI Academy
  "academy:get-progress",
  "academy:complete-lesson",
  "academy:record-challenge-attempt",
  "academy:list-projects",
  "academy:get-project",
  "academy:save-project",
  "academy:delete-project",
  "academy:ai-tutor",
  "academy:appy-tutor",
];

// Add valid receive channels
const validReceiveChannels = [
  "chat:response:chunk",
  "chat:response:end",
  "chat:response:error",
  "app:output",
  "github:flow-update",
  "github:flow-success",
  "github:flow-error",
  "deep-link-received",
  "oauth-callback",
  "terminal:output",
  "gemini-stream-chunk",
  "gemini-stream-complete",
  "gemini-stream-error",
  // Background task updates
  "background-task:update",
  // Terminal updates
  "terminal:data",
  "terminal:exit",
  "terminal:error",
  // Local build streaming
  "local-build:log",
  // Voice input trigger
  "trigger-voice-input",
  // Automation events
  "automation:create-tab",
  "automation:progress",
] as const;

type ValidInvokeChannel = (typeof validInvokeChannels)[number];
type ValidReceiveChannel = (typeof validReceiveChannels)[number];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel: ValidInvokeChannel, ...args: unknown[]) => {
      if (validInvokeChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      throw new Error(`Invalid channel: ${channel}`);
    },
    on: (
      channel: ValidReceiveChannel,
      listener: (...args: unknown[]) => void,
    ) => {
      if (validReceiveChannels.includes(channel)) {
        const subscription = (
          _event: Electron.IpcRendererEvent,
          ...args: unknown[]
        ) => listener(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      throw new Error(`Invalid channel: ${channel}`);
    },
    removeAllListeners: (channel: ValidReceiveChannel) => {
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
    removeListener: (
      channel: ValidReceiveChannel,
      listener: (...args: unknown[]) => void,
    ) => {
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, listener);
      }
    },
  },
});

// Expose terminal API
contextBridge.exposeInMainWorld("applaaTerminal", {
  create: (opts?: { cwd?: string }) => ipcRenderer.invoke("terminal:create", opts),
  write: (payload: { id: string; data: string }) => ipcRenderer.invoke("terminal:write", payload),
  resize: (payload: { id: string; cols: number; rows: number }) => ipcRenderer.invoke("terminal:resize", payload),
  kill: (payload: { id: string }) => ipcRenderer.invoke("terminal:kill", payload),
  onData: (cb: (e: { id: string; data: string }) => void) =>
    ipcRenderer.on("terminal:data", (_e, d) => cb(d)),
  onExit: (cb: (e: { id: string; code?: number }) => void) =>
    ipcRenderer.on("terminal:exit", (_e, d) => cb(d)),
  onError: (cb: (e: { id: string; error: string }) => void) =>
    ipcRenderer.on("terminal:error", (_e, d) => cb(d)),
});

// Expose shell API
contextBridge.exposeInMainWorld("applaaShell", {
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
});

// Expose a simple function to view database data in browser console
contextBridge.exposeInMainWorld("viewAppData", async () => {
  try {
    const result = await ipcRenderer.invoke("console-db-data");

    if (result.success) {
      console.group("🔍 Applaa Database Data");
      console.log("📊 Summary:", result.summary);
      console.log("\n📋 Apps:");
      console.table(result.apps);
      console.log("\n💬 Chats:");
      console.table(result.chats);
      console.log("\n📝 Versions:");
      console.table(result.versions);
      console.log("\n💬 Message Counts:");
      console.table(result.messageCounts);
      console.groupEnd();

      // Also return the data for further inspection
      return result;
    } else {
      console.error("❌ Error:", result.error);
      return result;
    }
  } catch (error) {
    console.error("❌ Failed to fetch database data:", error);
    throw error;
  }
});

// Also expose it via window.electron for consistency
contextBridge.exposeInMainWorld("applaa", {
  viewAppData: async () => {
    try {
      const result = await ipcRenderer.invoke("console-db-data");

      if (result.success) {
        console.group("🔍 Applaa Database Data");
        console.log("📊 Summary:", result.summary);
        console.log("\n📋 Apps:");
        console.table(result.apps);
        console.log("\n💬 Chats:");
        console.table(result.chats);
        console.log("\n📝 Versions:");
        console.table(result.versions);
        console.log("\n💬 Message Counts:");
        console.table(result.messageCounts);
        console.groupEnd();

        return result;
      } else {
        console.error("❌ Error:", result.error);
        return result;
      }
    } catch (error) {
      console.error("❌ Failed to fetch database data:", error);
      throw error;
    }
  },
  testGameImages: async () => {
    try {
      console.log("🔍 Testing all game image URLs...");
      const results = await ipcRenderer.invoke("games:test-all-images");

      console.group("📸 Game Image URL Test Results");

      const accessible = results.filter((r: any) => r.accessible);
      const failed = results.filter((r: any) => !r.accessible);

      console.log(`✅ Accessible: ${accessible.length}/${results.length}`);
      console.log(`❌ Failed: ${failed.length}/${results.length}`);

      if (accessible.length > 0) {
        console.log("\n✅ Accessible Images:");
        console.table(accessible.map((r: any) => ({
          Game: r.gameName,
          URL: r.imageUrl,
          Status: r.statusCode,
        })));
      }

      if (failed.length > 0) {
        console.log("\n❌ Failed Images:");
        console.table(failed.map((r: any) => ({
          Game: r.gameName,
          URL: r.imageUrl,
          Error: r.error || `Status: ${r.statusCode}`,
        })));
      }

      console.groupEnd();

      return results;
    } catch (error) {
      console.error("❌ Failed to test image URLs:", error);
      throw error;
    }
  },
});
