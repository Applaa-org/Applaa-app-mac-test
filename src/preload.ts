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
