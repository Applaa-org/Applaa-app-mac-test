import type { IpcRenderer } from "electron";
import {
  type ChatSummary,
  ChatSummariesSchema,
  type UserSettings,
  type ContextPathResults,
  type PromptItem,
} from "../lib/schemas";
import type {
  AppOutput,
  Chat,
  ChatResponseEnd,
  ChatProblemsEvent,
  CreateAppParams,
  CreateAppResult,
  ListAppsResponse,
  NodeSystemInfo,
  Message,
  Version,
  SystemDebugInfo,
  EASStatus,
  EASBuildResult,
  EASDeployResult,
  EASProject,
  EASBuildStatus,
  LocalModel,
  TokenCountParams,
  TokenCountResult,
  ChatLogsData,
  BranchResult,
  LanguageModelProvider,
  LanguageModel,
  CreateCustomLanguageModelProviderParams,
  CreateCustomLanguageModelParams,
  DoesReleaseNoteExistParams,
  ApproveProposalResult,
  ImportAppResult,
  ImportAppParams,
  RenameBranchParams,
  UserBudgetInfo,
  CopyAppParams,
  App,
  ComponentSelection,
  AppUpgrade,
  ProblemReport,
  EditAppFileReturnType,
  GetAppEnvVarsParams,
  SetAppEnvVarsParams,
  ConnectToExistingVercelProjectParams,
  IsVercelProjectAvailableResponse,
  CreateVercelProjectParams,
  VercelDeployment,
  GetVercelDeploymentsParams,
  DisconnectVercelProjectParams,
  IsVercelProjectAvailableParams,
  SaveVercelAccessTokenParams,
  VercelProject,
  UpdateChatParams,
  FileAttachment,
  CreateNeonProjectParams,
  NeonProject,
  GetNeonProjectParams,
  GetNeonProjectResponse,
  RevertVersionResponse,
  RevertVersionParams,
  RespondToAppInputParams,
} from "./ipc_types";
import type { Template } from "../shared/templates";
import type { OptimizePromptParams, OptimizePromptResponse } from "./handlers/prompt_optimization_handlers";
import type { AppChatContext, ProposalResult } from "@/lib/schemas";
import { showError } from "@/lib/toast";

export interface ChatStreamCallbacks {
  onUpdate: (messages: Message[]) => void;
  onEnd: (response: ChatResponseEnd) => void;
  onError: (error: string) => void;
}

export interface AppStreamCallbacks {
  onOutput: (output: AppOutput) => void;
}

export interface GitHubDeviceFlowUpdateData {
  userCode?: string;
  verificationUri?: string;
  message?: string;
}

export interface GitHubDeviceFlowSuccessData {
  message?: string;
}

export interface GitHubDeviceFlowErrorData {
  error: string;
}

export interface DeepLinkData {
  type: string;
}

interface DeleteCustomModelParams {
  providerId: string;
  modelApiName: string;
}

// Mock IPC renderer for browser environments
class MockIpcRenderer {
  on(channel: string, listener: (...args: any[]) => void): void {
    // No-op in browser
  }
  
  removeListener(channel: string, listener: (...args: any[]) => void): void {
    // No-op in browser
  }
  
  async invoke(channel: string, ...args: any[]): Promise<any> {
    console.warn(`[IPC] Mock: Cannot invoke '${channel}' in browser environment`);
    // Return mock data for common channels
    switch (channel) {
      case 'get-system-platform':
        return 'web';
      case 'get-templates':
        return [];
      case 'get-user-settings':
        return { 
          theme: 'light', 
          language: 'en',
          providerSettings: {
            openai: { apiKey: { value: '' } },
            anthropic: { apiKey: { value: '' } },
            auto: { apiKey: { value: '' } }
          },
          selectedModel: {
            name: 'gpt-4',
            provider: 'openai'
          }
        };
      case 'list-apps':
        return { apps: [] };
      case 'get-chats':
        return [];
      case 'get-language-model-providers':
        return [
          {
            id: 'openai',
            name: 'OpenAI',
            provider: 'openai',
            envVarName: 'OPENAI_API_KEY'
          },
          {
            id: 'anthropic', 
            name: 'Anthropic',
            provider: 'anthropic',
            envVarName: 'ANTHROPIC_API_KEY'
          }
        ];
      case 'get-env-vars':
        return {
          OPENAI_API_KEY: '',
          ANTHROPIC_API_KEY: '',
          NODE_ENV: 'development'
        };
      case 'prompts:list':
        return [];
      case 'window:minimize':
      case 'window:maximize':
      case 'window:close':
        console.log(`[IPC] Mock: Window operation '${channel}' ignored in browser`);
        return;
      default:
        // For other methods, just log and return empty/default values
        console.log(`[IPC] Mock: Method '${channel}' not implemented, returning null`);
        return null;
    }
  }
}

export class IpcClient {
  private static instance: IpcClient;
  private ipcRenderer: IpcRenderer | MockIpcRenderer;
  private chatStreams: Map<number, ChatStreamCallbacks>;
  private appStreams: Map<number, AppStreamCallbacks>;
  private isElectron: boolean;
  private loggedMissingCallbacks?: Set<number>;
  
  private constructor() {
    // Check if we're in an Electron environment
  this.isElectron = typeof window !== 'undefined' && !!(
           (window as any).electron && 
           (window as any).electron.ipcRenderer);
    
    if (this.isElectron) {
  this.ipcRenderer = (window as any).electron.ipcRenderer as IpcRenderer;
    } else {
      console.warn('[IPC] Running in browser mode - IPC functionality will be mocked');
      this.ipcRenderer = new MockIpcRenderer();
    }
    
    this.chatStreams = new Map();
    this.appStreams = new Map();
    
    // Set up listeners for stream events only in Electron environment
    if (this.isElectron) {
      this.setupEventListeners();
    }
  }
  
  private setupEventListeners(): void {
    if (!this.isElectron) return;
    
    this.ipcRenderer.on("chat:response:chunk", (data) => {
      if (
        data &&
        typeof data === "object" &&
        "chatId" in data &&
        "messages" in data
      ) {
        const { chatId, messages } = data as {
          chatId: number;
          messages: Message[];
        };

        const callbacks = this.chatStreams.get(chatId);
        if (callbacks) {
          callbacks.onUpdate(messages);
        } else {
          // 🚨 FIX: Reduce callback error spam - only log once per chat
          if (!this.loggedMissingCallbacks) {
            this.loggedMissingCallbacks = new Set();
          }
          if (!this.loggedMissingCallbacks.has(chatId)) {
            console.warn(`[IPC] No callbacks found for chat ${chatId} - this will only be logged once`);
            this.loggedMissingCallbacks.add(chatId);
          }
        }
      } else {
        showError(new Error(`[IPC] Invalid chunk data received: ${data}`));
      }
    });

    this.ipcRenderer.on("app:output", (data) => {
      if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        "message" in data &&
        "appId" in data
      ) {
        const { type, message, appId } = data as unknown as AppOutput;
        const callbacks = this.appStreams.get(appId);
        if (callbacks) {
          callbacks.onOutput({ type, message, appId, timestamp: Date.now() });
        }
      } else {
        showError(new Error(`[IPC] Invalid app output data received: ${data}`));
      }
    });

    this.ipcRenderer.on("chat:response:end", (payload) => {
      const { chatId } = payload as unknown as ChatResponseEnd;
      const callbacks = this.chatStreams.get(chatId);
      if (callbacks) {
        callbacks.onEnd(payload as unknown as ChatResponseEnd);
        console.log(`[IPC] ✅ Stream ended for chat ${chatId}, cleaning up callbacks`);
        this.chatStreams.delete(chatId);
        // Also clear from logged missing callbacks
        if (this.loggedMissingCallbacks) {
          this.loggedMissingCallbacks.delete(chatId);
        }
      } else {
        console.error(
          new Error(
            `[IPC] No callbacks found for chat ${chatId} on stream end`,
          ),
        );
      }
    });

    this.ipcRenderer.on("chat:response:error", (error) => {
      console.debug("chat:response:error");
      if (typeof error === "string") {
        for (const [chatId, callbacks] of this.chatStreams.entries()) {
          callbacks.onError(error);
          this.chatStreams.delete(chatId);
        }
      } else {
        console.error("[IPC] Invalid error data received:", error);
      }
    });
  }

  public static getInstance(): IpcClient {
    if (!IpcClient.instance) {
      IpcClient.instance = new IpcClient();
    }
    return IpcClient.instance;
  }

  public async restartDyad(): Promise<void> {
    await this.ipcRenderer.invoke("restart-dyad");
  }

  public async cleanAllApps(): Promise<{ success: boolean; message: string }> {
    return this.ipcRenderer.invoke("clean-all-apps");
  }

  public async reloadEnvPath(): Promise<void> {
    await this.ipcRenderer.invoke("reload-env-path");
  }

  // Create a new app with an initial chat
  public async createApp(params: CreateAppParams): Promise<CreateAppResult> {
    return this.ipcRenderer.invoke("create-app", params);
  }

  public async generateAppNames(params: {
    concept: string;
    domain?: string;
    audience?: string;
    tone?: string;
    features?: string[];
  }): Promise<Array<{ display_name: string; package_id: string; slug: string }>> {
    return this.ipcRenderer.invoke("generate-app-names", params);
  }

  // Semantic Context Methods
  public async getSemanticSuggestions(params: {
    query: string;
    appId: number;
    maxSuggestions?: number;
    minSimilarity?: number;
    excludePaths?: string[];
    includeOtherApps?: boolean;
    mentionedApps?: string[];
  }): Promise<Array<{
    filePath: string;
    similarity: number;
    relevanceScore: number;
    summary: string;
    language: string;
    tokens: number;
    reason: string;
  }>> {
    return this.ipcRenderer.invoke("semantic-context:get-suggestions", params);
  }

  public async indexApp(params: {
    appId: number;
    appPath: string;
    excludePaths?: string[];
    includePatterns?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("semantic-context:index-app", params);
  }

  public async updateSemanticFile(params: {
    appId: number;
    appPath: string;
    filePath: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("semantic-context:update-file", params);
  }

  public async deleteSemanticFile(params: {
    appId: number;
    filePath: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("semantic-context:delete-file", params);
  }

  public async deleteSemanticApp(params: {
    appId: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("semantic-context:delete-app", params);
  }

  public async recordSemanticFeedback(params: {
    filePath: string;
    appId: number;
    query: string;
    accepted: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("semantic-context:record-feedback", params);
  }

  public async getSemanticAnalytics(params: {
    appId?: number;
  }): Promise<{
    totalDocuments: number;
    topFiles: any[];
    averageAcceptanceRate: number;
    totalUsage: number;
  }> {
    return this.ipcRenderer.invoke("semantic-context:get-analytics", params);
  }

  public async isAppIndexed(params: {
    appId: number;
  }): Promise<boolean> {
    return this.ipcRenderer.invoke("semantic-context:is-app-indexed", params);
  }

  public async getSemanticFileCount(params: {
    appId: number;
  }): Promise<number> {
    return this.ipcRenderer.invoke("semantic-context:get-file-count", params);
  }

  // Semantic context methods removed for MVP

  // AI Features Installation
  public async installAITransformers(): Promise<{
    success: boolean;
    message: string;
    stdout?: string;
    stderr?: string;
  }> {
    return this.ipcRenderer.invoke("install-ai-transformers");
  }

  public async checkAITransformersInstalled(): Promise<{
    installed: boolean;
    path?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("check-ai-transformers-installed");
  }

  public async getApp(appId: number): Promise<App> {
    return this.ipcRenderer.invoke("get-app", appId);
  }

  public async getAppFiles(appId: number): Promise<string[]> {
    return this.ipcRenderer.invoke("get-app-files", appId);
  }

  public async getAppEnvVars(
    params: GetAppEnvVarsParams,
  ): Promise<{ key: string; value: string }[]> {
    return this.ipcRenderer.invoke("get-app-env-vars", params);
  }

  public async setAppEnvVars(params: SetAppEnvVarsParams): Promise<void> {
    return this.ipcRenderer.invoke("set-app-env-vars", params);
  }

  public async getChat(chatId: number): Promise<Chat> {
    try {
      const data = await this.ipcRenderer.invoke("get-chat", chatId);
      return data;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Get all chats
  public async getChats(appId?: number): Promise<ChatSummary[]> {
    try {
      const data = await this.ipcRenderer.invoke("get-chats", appId);
      return ChatSummariesSchema.parse(data);
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Get all apps
  public async listApps(): Promise<ListAppsResponse> {
    return this.ipcRenderer.invoke("list-apps");
  }

  public async readAppFile(appId: number, filePath: string): Promise<string> {
    return this.ipcRenderer.invoke("read-app-file", {
      appId,
      filePath,
    });
  }

  // Edit a file in an app directory
  public async editAppFile(
    appId: number,
    filePath: string,
    content: string,
  ): Promise<EditAppFileReturnType> {
    return this.ipcRenderer.invoke("edit-app-file", {
      appId,
      filePath,
      content,
    });
  }

  // New method for streaming responses
  public streamMessage(
    prompt: string,
    options: {
      selectedComponent: ComponentSelection | null;
      chatId: number;
      redo?: boolean;
      attachments?: FileAttachment[];
      onUpdate: (messages: Message[]) => void;
      onEnd: (response: ChatResponseEnd) => void;
      onError: (error: string) => void;
      onProblems?: (problems: ChatProblemsEvent) => void;
    },
  ): void {
    this.streamMessageInternal("chat:stream", prompt, options);
  }

  // Auto-fix streaming with cheaper models
  public streamAutoFix(
    prompt: string,
    options: {
      selectedComponent: ComponentSelection | null;
      chatId: number;
      redo?: boolean;
      attachments?: FileAttachment[];
      onUpdate: (messages: Message[]) => void;
      onEnd: (response: ChatResponseEnd) => void;
      onError: (error: string) => void;
      onProblems?: (problems: ChatProblemsEvent) => void;
    },
  ): void {
    // Use the standard chat stream channel to avoid handler divergence.
    // Auto-fix now reuses the main handler (model selection may still choose a cheaper model via settings).
    this.streamMessageInternal("chat:stream", prompt, options);
  }

  // Performance monitoring methods
  public async getPerformanceReport(): Promise<string> {
    return this.ipcRenderer.invoke("performance:get-report");
  }

  public async getPerformanceMetrics(): Promise<{
    completed: any[];
    active: any[];
  }> {
    return this.ipcRenderer.invoke("performance:get-metrics");
  }

  public async clearPerformanceMetrics(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("performance:clear");
  }

  public async logPerformanceReport(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("performance:log-report");
  }

  // Internal method for streaming (shared between regular and auto-fix)
  private streamMessageInternal(
    channel: string,
    prompt: string,
    options: {
      selectedComponent: ComponentSelection | null;
      chatId: number;
      redo?: boolean;
      attachments?: FileAttachment[];
      onUpdate: (messages: Message[]) => void;
      onEnd: (response: ChatResponseEnd) => void;
      onError: (error: string) => void;
      onProblems?: (problems: ChatProblemsEvent) => void;
    },
  ): void {
    const {
      chatId,
      redo,
      attachments,
      selectedComponent,
      onUpdate,
      onEnd,
      onError,
    } = options;
    
    // 🚨 FIX: Clear any existing callbacks for this chat to prevent stale references
    if (this.chatStreams.has(chatId)) {
      console.log(`[IPC] Clearing existing callbacks for chat ${chatId}`);
      this.chatStreams.delete(chatId);
    }
    
    // Clear from logged missing callbacks if it exists
    if (this.loggedMissingCallbacks) {
      this.loggedMissingCallbacks.delete(chatId);
    }

    // Store new callbacks for this chat
    this.chatStreams.set(chatId, { onUpdate, onEnd, onError });
    console.log(`[IPC] Registered callbacks for chat ${chatId}`);

    // Handle file attachments if provided
    if (attachments && attachments.length > 0) {
      // Process each file attachment and convert to base64
      Promise.all(
        attachments.map(async (attachment) => {
          return new Promise<{
            name: string;
            type: string;
            data: string;
            attachmentType: "upload-to-codebase" | "chat-context";
          }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: attachment.file.name,
                type: attachment.file.type,
                data: reader.result as string,
                attachmentType: attachment.type,
              });
            };
            reader.onerror = () =>
              reject(new Error(`Failed to read file: ${attachment.file.name}`));
            reader.readAsDataURL(attachment.file);
          });
        }),
      )
        .then((fileDataArray) => {
          // Use invoke to start the stream and pass the chatId and attachments
          this.ipcRenderer
            .invoke(channel, {
              prompt,
              chatId,
              redo,
              selectedComponent,
              attachments: fileDataArray,
            })
            .catch((err) => {
              showError(err);
              onError(String(err));
              this.chatStreams.delete(chatId);
            });
        })
        .catch((err) => {
          showError(err);
          onError(String(err));
          this.chatStreams.delete(chatId);
        });
    } else {
      // No attachments, proceed normally
      this.ipcRenderer
        .invoke(channel, {
          prompt,
          chatId,
          redo,
          selectedComponent,
        })
        .catch((err) => {
          showError(err);
          onError(String(err));
          this.chatStreams.delete(chatId);
        });
    }
  }

  // Method to cancel an ongoing stream
  public cancelChatStream(chatId: number): void {
    this.ipcRenderer.invoke("chat:cancel", chatId);
    const callbacks = this.chatStreams.get(chatId);
    if (callbacks) {
      this.chatStreams.delete(chatId);
    } else {
      console.error("Tried canceling chat that doesn't exist");
    }
  }

  // 🚀 NEW: Detect interrupted streams
  async detectInterruptedStream(chatId: number): Promise<{
    interrupted: boolean;
    messageId?: number;
    partialContent?: string;
    canResume: boolean;
  }> {
    return this.invoke("chat:detect-interrupted", chatId);
  }

  // 🚀 NEW: Resume interrupted streams
  async resumeInterruptedStream(params: {
    chatId: number;
    messageId: number;
    continuePrompt?: string;
  }): Promise<{ success: boolean; resumePrompt: string }> {
    return this.invoke("chat:resume-interrupted", params);
  }

  // Create a new chat for an app
  public async createChat(appId: number): Promise<number> {
    return this.ipcRenderer.invoke("create-chat", appId);
  }

  public async updateChat(params: UpdateChatParams): Promise<void> {
    return this.ipcRenderer.invoke("update-chat", params);
  }

  public async deleteChat(chatId: number): Promise<void> {
    await this.ipcRenderer.invoke("delete-chat", chatId);
  }

  public async deleteMessages(chatId: number): Promise<void> {
    await this.ipcRenderer.invoke("delete-messages", chatId);
  }

  // Open an external URL using the default browser
  public async openExternalUrl(url: string): Promise<void> {
    await this.ipcRenderer.invoke("open-external-url", url);
  }

  public async showItemInFolder(fullPath: string): Promise<void> {
    await this.ipcRenderer.invoke("show-item-in-folder", fullPath);
  }

  // Background dependency installation methods
  public async checkDependenciesNeeded(params: { appId: number }): Promise<{ needed: boolean; reason: string }> {
    return await this.ipcRenderer.invoke("check-dependencies-needed", params);
  }

  public async installDependenciesBackground(params: { appId: number }): Promise<void> {
    return await this.ipcRenderer.invoke("install-dependencies-background", params);
  }

  public async getDependencyInstallationStatus(params: { appId: number }): Promise<{ status: string; timestamp?: number; ageMinutes?: number }> {
    return await this.ipcRenderer.invoke("get-dependency-installation-status", params);
  }

  // Run an app
  public async runApp(
    appId: number,
    onOutput: (output: AppOutput) => void,
  ): Promise<void> {
    await this.ipcRenderer.invoke("run-app", { appId });
    this.appStreams.set(appId, { onOutput });
  }

  // Stop a running app
  public async stopApp(appId: number): Promise<void> {
    await this.ipcRenderer.invoke("stop-app", { appId });
  }

  // Restart a running app
  public async restartApp(
    appId: number,
    onOutput: (output: AppOutput) => void,
    removeNodeModules?: boolean,
  ): Promise<{ success: boolean }> {
    try {
      const result = await this.ipcRenderer.invoke("restart-app", {
        appId,
        removeNodeModules,
      });
      this.appStreams.set(appId, { onOutput });
      return result;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Respond to an app input request (y/n prompts)
  public async respondToAppInput(
    params: RespondToAppInputParams,
  ): Promise<void> {
    try {
      await this.ipcRenderer.invoke("respond-to-app-input", params);
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Get allow-listed environment variables
  public async getEnvVars(): Promise<Record<string, string | undefined>> {
    try {
      const envVars = await this.ipcRenderer.invoke("get-env-vars");
      return envVars as Record<string, string | undefined>;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // List all versions (commits) of an app
  public async listVersions({ appId }: { appId: number }): Promise<Version[]> {
    try {
      const versions = await this.ipcRenderer.invoke("list-versions", {
        appId,
      });
      return versions;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Revert to a specific version
  public async revertVersion(
    params: RevertVersionParams,
  ): Promise<RevertVersionResponse> {
    return this.ipcRenderer.invoke("revert-version", params);
  }

  // Checkout a specific version without creating a revert commit
  public async checkoutVersion({
    appId,
    versionId,
  }: {
    appId: number;
    versionId: string;
  }): Promise<void> {
    await this.ipcRenderer.invoke("checkout-version", {
      appId,
      versionId,
    });
  }

  // Get the current branch of an app
  public async getCurrentBranch(appId: number): Promise<BranchResult> {
    return this.ipcRenderer.invoke("get-current-branch", {
      appId,
    });
  }

  // Get user settings
  public async getUserSettings(): Promise<UserSettings> {
    try {
      const settings = await this.ipcRenderer.invoke("get-user-settings");
      return settings;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Update user settings
  public async setUserSettings(
    settings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    try {
      const updatedSettings = await this.ipcRenderer.invoke(
        "set-user-settings",
        settings,
      );
      return updatedSettings;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // 🚀 SMART CACHE: Manual cache invalidation
  public async invalidateSettingsCache(): Promise<{ success: boolean }> {
    try {
      return await this.ipcRenderer.invoke("invalidate-settings-cache");
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Delete an app and all its files
  public async deleteApp(appId: number): Promise<void> {
    await this.ipcRenderer.invoke("delete-app", { appId });
  }

  // Rename an app (update name and path)
  public async renameApp({
    appId,
    appName,
    appPath,
  }: {
    appId: number;
    appName: string;
    appPath: string;
  }): Promise<void> {
    await this.ipcRenderer.invoke("rename-app", {
      appId,
      appName,
      appPath,
    });
  }

  public async copyApp(params: CopyAppParams): Promise<{ app: App }> {
    return this.ipcRenderer.invoke("copy-app", params);
  }

  // Reset all - removes all app files, settings, and drops the database
  public async resetAll(): Promise<void> {
    await this.ipcRenderer.invoke("reset-all");
  }

  public async addDependency({
    chatId,
    packages,
  }: {
    chatId: number;
    packages: string[];
  }): Promise<void> {
    await this.ipcRenderer.invoke("chat:add-dep", {
      chatId,
      packages,
    });
  }

  // Check Node.js and npm status
  public async getNodejsStatus(): Promise<NodeSystemInfo> {
    return this.ipcRenderer.invoke("nodejs-status");
  }

  // --- GitHub Device Flow ---
  public startGithubDeviceFlow(appId: number | null): void {
    this.ipcRenderer.invoke("github:start-flow", { appId });
  }

  public onGithubDeviceFlowUpdate(
    callback: (data: GitHubDeviceFlowUpdateData) => void,
  ): () => void {
    const listener = (data: any) => {
      console.log("github:flow-update", data);
      callback(data as GitHubDeviceFlowUpdateData);
    };
    this.ipcRenderer.on("github:flow-update", listener);
    // Return a function to remove the listener
    return () => {
      this.ipcRenderer.removeListener("github:flow-update", listener);
    };
  }

  public onGithubDeviceFlowSuccess(
    callback: (data: GitHubDeviceFlowSuccessData) => void,
  ): () => void {
    const listener = (data: any) => {
      console.log("github:flow-success", data);
      callback(data as GitHubDeviceFlowSuccessData);
    };
    this.ipcRenderer.on("github:flow-success", listener);
    return () => {
      this.ipcRenderer.removeListener("github:flow-success", listener);
    };
  }

  public onGithubDeviceFlowError(
    callback: (data: GitHubDeviceFlowErrorData) => void,
  ): () => void {
    const listener = (data: any) => {
      console.log("github:flow-error", data);
      callback(data as GitHubDeviceFlowErrorData);
    };
    this.ipcRenderer.on("github:flow-error", listener);
    return () => {
      this.ipcRenderer.removeListener("github:flow-error", listener);
    };
  }
  // --- End GitHub Device Flow ---

  // --- GitHub Repo Management ---
  public async listGithubRepos(): Promise<
    { name: string; full_name: string; private: boolean }[]
  > {
    return this.ipcRenderer.invoke("github:list-repos");
  }

  public async getGithubRepoBranches(
    owner: string,
    repo: string,
  ): Promise<{ name: string; commit: { sha: string } }[]> {
    return this.ipcRenderer.invoke("github:get-repo-branches", {
      owner,
      repo,
    });
  }

  public async connectToExistingGithubRepo(
    owner: string,
    repo: string,
    branch: string,
    appId: number,
  ): Promise<void> {
    await this.ipcRenderer.invoke("github:connect-existing-repo", {
      owner,
      repo,
      branch,
      appId,
    });
  }

  public async checkGithubRepoAvailable(
    org: string,
    repo: string,
  ): Promise<{ available: boolean; error?: string }> {
    return this.ipcRenderer.invoke("github:is-repo-available", {
      org,
      repo,
    });
  }

  public async createGithubRepo(
    org: string,
    repo: string,
    appId: number,
    branch?: string,
  ): Promise<void> {
    await this.ipcRenderer.invoke("github:create-repo", {
      org,
      repo,
      appId,
      branch,
    });
  }

  // Sync (push) local repo to GitHub
  public async syncGithubRepo(
    appId: number,
    force?: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("github:push", {
      appId,
      force,
    });
  }

  // Auto push entire working tree to GitHub (uses main-process handler)
  public async autoPushToGithub(params: {
    appId: number;
    githubToken: string;
    githubUsername: string;
    repoName: string;
    appPath: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("github:auto-push", params);
  }

  public async disconnectGithubRepo(appId: number): Promise<void> {
    await this.ipcRenderer.invoke("github:disconnect", {
      appId,
    });
  }
  // --- End GitHub Repo Management ---

  // --- Vercel Token Management ---
  public async saveVercelAccessToken(
    params: SaveVercelAccessTokenParams,
  ): Promise<void> {
    await this.ipcRenderer.invoke("vercel:save-token", params);
  }
  // --- End Vercel Token Management ---

  // --- Vercel Project Management ---
  public async listVercelProjects(): Promise<VercelProject[]> {
    return this.ipcRenderer.invoke("vercel:list-projects", undefined);
  }

  public async connectToExistingVercelProject(
    params: ConnectToExistingVercelProjectParams,
  ): Promise<void> {
    await this.ipcRenderer.invoke("vercel:connect-existing-project", params);
  }

  public async isVercelProjectAvailable(
    params: IsVercelProjectAvailableParams,
  ): Promise<IsVercelProjectAvailableResponse> {
    return this.ipcRenderer.invoke("vercel:is-project-available", params);
  }

  public async createVercelProject(
    params: CreateVercelProjectParams,
  ): Promise<void> {
    await this.ipcRenderer.invoke("vercel:create-project", params);
  }

  // Get Vercel Deployments
  public async getVercelDeployments(
    params: GetVercelDeploymentsParams,
  ): Promise<VercelDeployment[]> {
    return this.ipcRenderer.invoke("vercel:get-deployments", params);
  }

  public async disconnectVercelProject(
    params: DisconnectVercelProjectParams,
  ): Promise<void> {
    await this.ipcRenderer.invoke("vercel:disconnect", params);
  }
  
  // --- Direct Vercel Deployment ---
  public async deployToVercel(params: {
    vercelToken: string;
    githubUsername: string;
    repoName: string;
    githubToken: string;
  }): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.ipcRenderer.invoke("vercel:deploy", params);
  }
  // --- End Vercel Project Management ---

  // --- App Deployment URL Updates ---
  public async updateAppDeploymentUrls(params: {
    appId: number;
    githubRepoUrl?: string;
    vercelDeploymentUrl?: string;
    deploymentStatus?: string;
    deploymentNotes?: string;
  }): Promise<void> {
    await this.ipcRenderer.invoke("app:update-deployment-urls", params);
  }
  // --- End App Deployment URL Updates ---

  // Get the main app version
  public async getAppVersion(): Promise<string> {
    const result = await this.ipcRenderer.invoke("get-app-version");
    return result.version as string;
  }

  // Get proposal details
  public async getProposal(chatId: number): Promise<ProposalResult | null> {
    try {
      const data = await this.ipcRenderer.invoke("get-proposal", { chatId });
      // Assuming the main process returns data matching the ProposalResult interface
      // Add a type check/guard if necessary for robustness
      return data as ProposalResult | null;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Example methods for listening to events (if needed)
  // public on(channel: string, func: (...args: any[]) => void): void {

  // --- Proposal Management ---
  public async approveProposal({
    chatId,
    messageId,
  }: {
    chatId: number;
    messageId: number;
  }): Promise<ApproveProposalResult> {
    return this.ipcRenderer.invoke("approve-proposal", {
      chatId,
      messageId,
    });
  }

  public async rejectProposal({
    chatId,
    messageId,
  }: {
    chatId: number;
    messageId: number;
  }): Promise<void> {
    await this.ipcRenderer.invoke("reject-proposal", {
      chatId,
      messageId,
    });
  }
  // --- End Proposal Management ---

  // --- Supabase Management ---
  public async listSupabaseProjects(): Promise<any[]> {
    return this.ipcRenderer.invoke("supabase:list-projects");
  }

  public async setSupabaseAppProject(
    project: string,
    app: number,
  ): Promise<void> {
    await this.ipcRenderer.invoke("supabase:set-app-project", {
      project,
      app,
    });
  }

  public async unsetSupabaseAppProject(app: number): Promise<void> {
    await this.ipcRenderer.invoke("supabase:unset-app-project", {
      app,
    });
  }

  public async fakeHandleSupabaseConnect(params: {
    appId: number;
    fakeProjectId: string;
  }): Promise<void> {
    await this.ipcRenderer.invoke(
      "supabase:fake-connect-and-set-project",
      params,
    );
  }

  // --- End Supabase Management ---

  // --- Neon Management ---
  public async fakeHandleNeonConnect(): Promise<void> {
    await this.ipcRenderer.invoke("neon:fake-connect");
  }

  public async createNeonProject(
    params: CreateNeonProjectParams,
  ): Promise<NeonProject> {
    return this.ipcRenderer.invoke("neon:create-project", params);
  }

  public async getNeonProject(
    params: GetNeonProjectParams,
  ): Promise<GetNeonProjectResponse> {
    return this.ipcRenderer.invoke("neon:get-project", params);
  }

  // --- End Neon Management ---

  // --- Portal Management ---
  public async portalMigrateCreate(params: {
    appId: number;
  }): Promise<{ output: string }> {
    return this.ipcRenderer.invoke("portal:migrate-create", params);
  }

  // --- End Portal Management ---

  public async getSystemDebugInfo(): Promise<SystemDebugInfo> {
    return this.ipcRenderer.invoke("get-system-debug-info");
  }

  public async getChatLogs(chatId: number): Promise<ChatLogsData> {
    return this.ipcRenderer.invoke("get-chat-logs", chatId);
  }

  public async uploadToSignedUrl(
    url: string,
    contentType: string,
    data: any,
  ): Promise<void> {
    await this.ipcRenderer.invoke("upload-to-signed-url", {
      url,
      contentType,
      data,
    });
  }

  public async listLocalOllamaModels(): Promise<LocalModel[]> {
    const response = await this.ipcRenderer.invoke("local-models:list-ollama");
    return response?.models || [];
  }

  public async listLocalLMStudioModels(): Promise<LocalModel[]> {
    const response = await this.ipcRenderer.invoke(
      "local-models:list-lmstudio",
    );
    return response?.models || [];
  }

  // Listen for deep link events
  public onDeepLinkReceived(
    callback: (data: DeepLinkData) => void,
  ): () => void {
    const listener = (data: any) => {
      callback(data as DeepLinkData);
    };
    this.ipcRenderer.on("deep-link-received", listener);
    return () => {
      this.ipcRenderer.removeListener("deep-link-received", listener);
    };
  }

  // Count tokens for a chat and input
  public async countTokens(
    params: TokenCountParams,
  ): Promise<TokenCountResult> {
    try {
      const result = await this.ipcRenderer.invoke("chat:count-tokens", params);
      return result as TokenCountResult;
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Window control methods
  public async minimizeWindow(): Promise<void> {
    try {
      await this.ipcRenderer.invoke("window:minimize");
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  public async maximizeWindow(): Promise<void> {
    try {
      await this.ipcRenderer.invoke("window:maximize");
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  public async closeWindow(): Promise<void> {
    try {
      await this.ipcRenderer.invoke("window:close");
    } catch (error) {
      showError(error);
      throw error;
    }
  }

  // Get system platform (win32, darwin, linux)
  public async getSystemPlatform(): Promise<string> {
    return this.ipcRenderer.invoke("get-system-platform");
  }

  public async doesReleaseNoteExist(
    params: DoesReleaseNoteExistParams,
  ): Promise<{ exists: boolean; url?: string }> {
    return this.ipcRenderer.invoke("does-release-note-exist", params);
  }

  public async getLanguageModelProviders(): Promise<LanguageModelProvider[]> {
    return this.ipcRenderer.invoke("get-language-model-providers");
  }

  public async getLanguageModels(params: {
    providerId: string;
  }): Promise<LanguageModel[]> {
    return this.ipcRenderer.invoke("get-language-models", params);
  }

  public async getLanguageModelsByProviders(): Promise<
    Record<string, LanguageModel[]>
  > {
    return this.ipcRenderer.invoke("get-language-models-by-providers");
  }

  public async createCustomLanguageModelProvider({
    id,
    name,
    apiBaseUrl,
    envVarName,
  }: CreateCustomLanguageModelProviderParams): Promise<LanguageModelProvider> {
    return this.ipcRenderer.invoke("create-custom-language-model-provider", {
      id,
      name,
      apiBaseUrl,
      envVarName,
    });
  }

  public async createCustomLanguageModel(
    params: CreateCustomLanguageModelParams,
  ): Promise<void> {
    await this.ipcRenderer.invoke("create-custom-language-model", params);
  }

  public async deleteCustomLanguageModel(modelId: string): Promise<void> {
    return this.ipcRenderer.invoke("delete-custom-language-model", modelId);
  }

  async deleteCustomModel(params: DeleteCustomModelParams): Promise<void> {
    return this.ipcRenderer.invoke("delete-custom-model", params);
  }

  async deleteCustomLanguageModelProvider(providerId: string): Promise<void> {
    return this.ipcRenderer.invoke("delete-custom-language-model-provider", {
      providerId,
    });
  }

  public async selectAppFolder(): Promise<{
    path: string | null;
    name: string | null;
  }> {
    return this.ipcRenderer.invoke("select-app-folder");
  }

  public async selectDirectory({ title, defaultPath }: { title?: string; defaultPath?: string }): Promise<{ path: string | null }> {
    return this.ipcRenderer.invoke("select-directory", { title, defaultPath });
  }

  // Get the apps base directory as resolved in the main process
  public async getAppsBasePath(): Promise<{ basePath: string }> {
    return this.ipcRenderer.invoke("get-apps-base-path");
  }

  public async checkAiRules(params: {
    path: string;
  }): Promise<{ exists: boolean }> {
    return this.ipcRenderer.invoke("check-ai-rules", params);
  }

  public async importApp(params: ImportAppParams): Promise<ImportAppResult> {
    return this.ipcRenderer.invoke("import-app", params);
  }

  async checkAppName(params: {
    appName: string;
  }): Promise<{ exists: boolean }> {
    return this.ipcRenderer.invoke("check-app-name", params);
  }

  public async renameBranch(params: RenameBranchParams): Promise<void> {
    await this.ipcRenderer.invoke("rename-branch", params);
  }

  async clearSessionData(): Promise<void> {
    return this.ipcRenderer.invoke("clear-session-data");
  }

  // Method to get user budget information
  public async getUserBudget(): Promise<UserBudgetInfo | null> {
    return this.ipcRenderer.invoke("get-user-budget");
  }

  public async getChatContextResults(params: {
    appId: number;
  }): Promise<ContextPathResults> {
    return this.ipcRenderer.invoke("get-context-paths", params);
  }

  public async setChatContext(params: {
    appId: number;
    chatContext: AppChatContext;
  }): Promise<void> {
    await this.ipcRenderer.invoke("set-context-paths", params);
  }

  public async getAppUpgrades(params: {
    appId: number;
  }): Promise<AppUpgrade[]> {
    return this.ipcRenderer.invoke("get-app-upgrades", params);
  }

  public async executeAppUpgrade(params: {
    appId: number;
    upgradeId: string;
  }): Promise<void> {
    return this.ipcRenderer.invoke("execute-app-upgrade", params);
  }

  // Capacitor methods
  public async isCapacitor(params: { appId: number }): Promise<boolean> {
    return this.ipcRenderer.invoke("is-capacitor", params);
  }

  public async syncCapacitor(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("sync-capacitor", params);
  }

  public async openIos(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("open-ios", params);
  }

  public async openAndroid(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("open-android", params);
  }

  // Expo Mobile methods (removed for MVP)

  // Flutter Mobile methods
  public async isFlutterMobile(params: { appId: number }): Promise<boolean> {
    return this.ipcRenderer.invoke("is-flutter-mobile", params);
  }

  public async syncFlutterMobile(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("sync-flutter-mobile", params);
  }

  public async openFlutterIos(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("open-flutter-ios", params);
  }

  public async openFlutterAndroid(params: { appId: number }): Promise<void> {
    return this.ipcRenderer.invoke("open-flutter-android", params);
  }

  public async checkProblems(params: {
    appId: number;
  }): Promise<ProblemReport> {
    return this.ipcRenderer.invoke("check-problems", params);
  }

  // Template methods
  public async getTemplates(): Promise<Template[]> {
    return this.ipcRenderer.invoke("get-templates");
  }

  // Expo methods
  public async expoStart(params: { appId?: number; useTunnel?: boolean; native?: boolean } = {}): Promise<any> {
    return this.ipcRenderer.invoke("expo:start", params);
  }

  public async expoStop(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("expo:stop");
  }

  public async expoStatus(): Promise<{
    isRunning: boolean;
    webUrl?: string;
    lanUrl?: string;
    tunnelUrl?: string;
    qrUrl?: string;
    terminalOutput?: string;
    lastHotReload?: number;
    buildStatus?: 'idle' | 'building' | 'success' | 'error';
    buildProgress?: string;
  }> {
    return this.ipcRenderer.invoke("expo:status");
  }

  public async expoHealthCheck(): Promise<{
    healthy: boolean;
    reason: string;
    url?: string;
    responseTime?: number;
  }> {
    return this.ipcRenderer.invoke("expo:health-check");
  }

  public async expoTriggerReload(): Promise<{
    success: boolean;
    reason?: string;
  }> {
    return this.ipcRenderer.invoke("expo:trigger-reload");
  }

  public async expoReset(): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("expo:reset");
  }

  // Supabase Authentication Methods
  public async supabaseInitialize(config: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:initialize", config);
  }

  public async supabaseInitializeFromSettings(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:initialize-from-settings");
  }

  public async supabaseSignUp(params: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:sign-up", params);
  }

  public async supabaseSignIn(params: {
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:sign-in", params);
  }

  public async supabaseSignOut(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:sign-out");
  }

  public async supabaseGetCurrentUser(): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:get-current-user");
  }

  public async supabaseGetCurrentSession(): Promise<{
    success: boolean;
    session?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:get-current-session");
  }

  public async supabaseResetPassword(params: {
    email: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:reset-password", params);
  }

  public async supabaseUpdatePassword(params: {
    newPassword: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:update-password", params);
  }

  public async supabaseUpdateProfile(updates: {
    fullName?: string;
    avatarUrl?: string;
  }): Promise<{
    success: boolean;
    user?: any;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:update-profile", updates);
  }

  public async supabaseIsAuthenticated(): Promise<{
    isAuthenticated: boolean;
    user?: any;
    session?: any;
  }> {
    return this.ipcRenderer.invoke("supabase:is-authenticated");
  }

  public async supabaseSaveCredentials(credentials: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:save-credentials", credentials);
  }

  public async supabaseCheckConfiguration(): Promise<{
    isConfigured: boolean;
    source: 'settings' | 'environment' | 'none' | 'error';
    hasUrl?: boolean;
    hasAnonKey?: boolean;
    hasServiceRoleKey?: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:check-configuration");
  }

  public async supabaseSignInWithGoogle(): Promise<{
    success: boolean;
    url?: string;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("supabase:sign-in-with-google");
  }

  public async supabaseSetSession(params: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("supabase:set-session", params);
  }

  // R2 Storage Methods
  public async r2Initialize(config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:initialize", config);
  }

  public async r2InitializeFromSettings(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:initialize-from-settings");
  }

  public async r2SaveCredentials(credentials: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:save-credentials", credentials);
  }

  public async r2UploadFile(params: {
    localPath: string;
    r2Key: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:upload-file", params);
  }

  public async r2DownloadFile(params: {
    r2Key: string;
    localPath: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:download-file", params);
  }

  public async r2DeleteFile(params: {
    r2Key: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:delete-file", params);
  }

  public async r2ListFiles(params: {
    prefix?: string;
    maxKeys?: number;
  }): Promise<{
    success: boolean;
    files?: any[];
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:list-files", params);
  }

  public async r2FileExists(params: {
    r2Key: string;
  }): Promise<{
    success: boolean;
    exists?: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:file-exists", params);
  }

  public async r2SyncApp(options: {
    appId: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    dryRun?: boolean;
  }): Promise<{
    success: boolean;
    uploaded: number;
    skipped: number;
    errors: string[];
    message?: string;
  }> {
    return this.ipcRenderer.invoke("r2:sync-app", options);
  }

  public async r2RestoreApp(params: {
    appId: number;
    targetPath: string;
  }): Promise<{
    success: boolean;
    uploaded: number;
    skipped: number;
    errors: string[];
    message?: string;
  }> {
    return this.ipcRenderer.invoke("r2:restore-app", params);
  }

  public async r2GetAppSyncStatus(params: {
    appId: number;
  }): Promise<{
    success: boolean;
    status?: {
      fileCount: number;
      totalSize: number;
      lastSync: Date | null;
      hasRemoteFiles: boolean;
    };
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:get-app-sync-status", params);
  }

  public async r2TestConnection(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("r2:test-connection");
  }

  // Analytics Methods
  public async analyticsInitialize(config: {
    ga4MeasurementId?: string;
    sentryDsn?: string;
    environment: 'development' | 'production';
    userId?: string;
    consent: {
      essential: boolean;
      analytics: boolean;
      performance: boolean;
      crash_reporting: boolean;
      improvement_data: boolean;
    };
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:initialize", config);
  }

  public async analyticsInitializeFromSettings(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:initialize-from-settings");
  }

  public async analyticsTrackEvent(params: {
    eventName: string;
    eventData: any;
    skipConsent?: boolean;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:track-event", params);
  }

  public async analyticsTrackError(params: {
    error: { name: string; message: string; stack?: string };
    context?: Record<string, any>;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:track-error", params);
  }

  public async analyticsTrackPerformance(params: {
    metric: string;
    value: number;
    context?: Record<string, any>;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:track-performance", params);
  }

  public async analyticsUpdateConsent(consent: {
    essential?: boolean;
    analytics?: boolean;
    performance?: boolean;
    crash_reporting?: boolean;
    improvement_data?: boolean;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:update-consent", consent);
  }

  public async analyticsGetConsent(): Promise<{
    success: boolean;
    consent?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:get-consent");
  }

  public async analyticsIsInitialized(): Promise<{
    success: boolean;
    initialized?: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:is-initialized");
  }

  public async analyticsGetConfigStatus(): Promise<{
    success: boolean;
    status?: {
      hasGA4: boolean;
      hasSentry: boolean;
      isInitialized: boolean;
      environment: string;
    };
    error?: string;
  }> {
    return this.ipcRenderer.invoke("analytics:get-config-status");
  }

  // Convenience methods for common events
  public async analyticsAppCreationStarted(params: {
    appType: string;
    template?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:app-creation-started", params);
  }

  public async analyticsAppCreationCompleted(params: {
    appType: string;
    duration: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:app-creation-completed", params);
  }

  public async analyticsPreviewOpened(params: {
    appType: string;
    previewType: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:preview-opened", params);
  }

  public async analyticsChatMessageSent(params: {
    messageLength: number;
    appContext: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:chat-message-sent", params);
  }

  public async analyticsCodeGenerated(params: {
    linesOfCode: number;
    language: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:code-generated", params);
  }

  public async analyticsExpoPreviewUsed(params: {
    success: boolean;
    loadTime: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:expo-preview-used", params);
  }

  public async analyticsGithubSyncUsed(params: {
    action: 'push' | 'pull' | 'clone';
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:github-sync-used", params);
  }

  public async analyticsCloudStorageUsed(params: {
    action: 'upload' | 'download' | 'sync';
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:cloud-storage-used", params);
  }

  public async analyticsUserSignedIn(params: {
    method?: 'email' | 'oauth';
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:user-signed-in", params);
  }

  public async analyticsUserSignedUp(params: {
    method?: 'email' | 'oauth';
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:user-signed-up", params);
  }

  public async analyticsUserSignedOut(): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:user-signed-out");
  }

  public async analyticsAppSynced(params: {
    appId: number;
    fileCount: number;
    sizeBytes: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:app-synced", params);
  }

  public async analyticsAppRestored(params: {
    appId: number;
    fileCount: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:app-restored", params);
  }

  public async analyticsSyncFailed(params: {
    errorType: string;
    appId: number;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("analytics:sync-failed", params);
  }



  public async optimizePrompt(params: OptimizePromptParams): Promise<OptimizePromptResponse> {
    return this.ipcRenderer.invoke("prompt:optimize", params);
  }

  // Terminal methods - DISABLED to prevent EPIPE errors
  // public async executeTerminalCommand(params: { appId: number; command: string }): Promise<{ success: boolean; pid?: number }> {
  //   return this.ipcRenderer.invoke("terminal:execute", params);
  // }

  // public async stopTerminal(params: { appId: number }): Promise<{ success: boolean }> {
  //   return this.ipcRenderer.invoke("terminal:stop", params);
  // }

  // public async getTerminalStatus(params: { appId: number }): Promise<{ isRunning: boolean; command?: string; pid?: number }> {
  //   return this.ipcRenderer.invoke("terminal:status", params);
  // }

  // public async clearTerminal(params: { appId: number }): Promise<{ success: boolean }> {
  //   return this.ipcRenderer.invoke("terminal:clear", params);
  // }

  // Backward compatibility aliases for expo methods
  public async getExpoStatus(appId?: number): Promise<{
    isRunning: boolean;
    webUrl?: string;
    tunnelUrl?: string;
    lanUrl?: string;
    qrUrl?: string;
  }> {
    return this.expoStatus();
  }

  public async startExpo(params: { appId?: number; useTunnel?: boolean; native?: boolean } = {}): Promise<any> {
    // Try new dual handler first, fallback to original if not available
    if (params.appId) {
      try {
        return await this.ipcRenderer.invoke("expo:start-dual", { appId: params.appId });
      } catch (error) {
        console.warn("Dual Expo handler not available, falling back to original:", error);
        return this.expoStart(params);
      }
    }
    return this.expoStart(params);
  }

  public async stopExpo(appId?: number): Promise<{ success: boolean }> {
    // Try new dual handler first, fallback to original if not available
    if (appId) {
      try {
        return await this.ipcRenderer.invoke("expo:stop-dual", { appId });
      } catch (error) {
        console.warn("Dual Expo stop handler not available, falling back to original:", error);
        return this.expoStop();
      }
    }
    return this.expoStop();
  }

  // New dual Expo methods
  public async startDualExpo(appId: number): Promise<any> {
    return this.ipcRenderer.invoke("expo:start-dual", { appId });
  }

  public async stopDualExpo(appId: number): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("expo:stop-dual", { appId });
  }

  public async getDualExpoStatus(appId: number): Promise<any> {
    return this.ipcRenderer.invoke("expo:status-dual", { appId });
  }

  public async checkDualExpoHealth(appId: number): Promise<any> {
    return this.ipcRenderer.invoke("expo:health-dual", { appId });
  }

  // Prompt library methods - DISABLED FOR MVP
  public async listPrompts(): Promise<PromptItem[]> {
    return [];
  }

  public async createPrompt(params: {
    title: string;
    description?: string;
    content: string;
    category?: string;
  }): Promise<PromptItem> {
    throw new Error('Prompts feature disabled for MVP');
  }

  public async updatePrompt(params: {
    id: number;
    title: string;
    description?: string;
    content: string;
    category?: string;
  }): Promise<void> {
    throw new Error('Prompts feature disabled for MVP');
  }

  public async deletePrompt(id: number): Promise<void> {
    throw new Error('Prompts feature disabled for MVP');
  }

  public async seedPrompts(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Prompts feature disabled for MVP' };
  }

  public async clearPrompts(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Prompts feature disabled for MVP' };
  }

  public async reseedPrompts(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Prompts feature disabled for MVP' };
  }

  // Flutter Environment Management
  async flutterDoctor(): Promise<import('@/lib/mobile/types').FlutterDoctorResult> {
    return this.ipcRenderer.invoke('flutter:doctor');
  }

  async checkFlutterSDK(): Promise<{ installed: boolean; version?: string; channel?: string }> {
    return this.ipcRenderer.invoke('flutter:check-sdk');
  }

  async getFlutterVersion(): Promise<import('@/lib/mobile/types').Result<{
    flutter: string;
    channel: string;
    dart: string;
    framework: string;
    engine: string;
  }>> {
    return this.ipcRenderer.invoke('flutter:get-version');
  }

  // Cost Analytics Methods
  async getCostAnalytics(): Promise<{
    totalRequests: number;
    cacheHits: number;
    estimatedSavings: number;
    dailySavings: number;
    monthlySavings: number;
    annualSavings: number;
    topProviders: Array<{ provider: string; requests: number }>;
    cachingStrategies: Record<string, string[]>;
  }> {
    return this.ipcRenderer.invoke('cost-analytics:get-stats');
  }

  async resetCostAnalytics(): Promise<void> {
    return this.ipcRenderer.invoke('cost-analytics:reset-stats');
  }

  // Batch Processing Methods
  async createOptimizedBatch(request: {
    type: "app_generation" | "code_review" | "content_analysis";
    requests: Array<{
      id: string;
      prompt: string;
      systemPrompt?: string;
      metadata?: any;
    }>;
    model?: string;
  }): Promise<{
    batchId: string;
    requestCount: number;
    estimatedCompletion: string;
    costSavings: {
      standardCost: number;
      optimizedCost: number;
      totalSavings: number;
      savingsPercentage: number;
    };
  }> {
    return this.ipcRenderer.invoke('batch:create-optimized', request);
  }

  async getBatchStatus(batchId: string): Promise<{
    id: string;
    type: "message_batch";
    processing_status: "in_progress" | "completed" | "failed" | "canceled" | "expired";
    request_counts: {
      processing: number;
      succeeded: number;
      errored: number;
      canceled: number;
      expired: number;
    };
    ended_at?: string;
    created_at: string;
    expires_at: string;
  }> {
    return this.ipcRenderer.invoke('batch:get-status', batchId);
  }

  async getBatchResults(batchId: string): Promise<Array<{
    custom_id: string;
    result: {
      type: "succeeded" | "errored" | "canceled" | "expired";
      message?: any;
      error?: {
        type: string;
        message: string;
      };
    };
  }>> {
    return this.ipcRenderer.invoke('batch:get-results', batchId);
  }

  async cancelBatch(batchId: string): Promise<any> {
    return this.ipcRenderer.invoke('batch:cancel', batchId);
  }

  async installFlutterSDK(): Promise<import('@/lib/mobile/types').Result<{
    platform: string;
    downloadUrl: string;
    instructions: string[];
    requirements: string[];
  }>> {
    return this.ipcRenderer.invoke('flutter:install-sdk');
  }

  async isFlutterInPath(): Promise<boolean> {
    return this.ipcRenderer.invoke('flutter:is-in-path');
  }

  async getFlutterPath(): Promise<import('@/lib/mobile/types').Result<string>> {
    return this.ipcRenderer.invoke('flutter:get-path');
  }

  async validateFlutterEnvironment(): Promise<import('@/lib/mobile/types').Result<{
    ready: boolean;
    issues: string[];
    recommendations: string[];
  }>> {
    return this.ipcRenderer.invoke('flutter:validate-environment');
  }

  // Flutter Project Management
  async createFlutterProject(options: import('@/lib/mobile/types').ProjectCreationOptions): Promise<import('@/lib/mobile/types').Result<import('@/lib/mobile/types').FlutterProject>> {
    return this.ipcRenderer.invoke('flutter:create-project', options);
  }

  async validateFlutterProject(projectPath: string): Promise<import('@/lib/mobile/types').Result<{
    valid: boolean;
    issues: string[];
    warnings: string[];
    projectType?: 'flutter' | 'unknown';
  }>> {
    return this.ipcRenderer.invoke('flutter:validate-project', projectPath);
  }

  async getFlutterProjectDependencies(projectPath: string): Promise<import('@/lib/mobile/types').Result<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    flutterVersion: string;
    dartVersion: string;
  }>> {
    return this.ipcRenderer.invoke('flutter:get-dependencies', projectPath);
  }

  // Simple Expo methods - RORK-style approach
  public async simpleExpoStart(params: { appId: number; useTunnel?: boolean }): Promise<{
    success: boolean;
    isRunning: boolean;
    webUrl?: string;
    qrUrl?: string;
    lanUrl?: string;
    tunnelUrl?: string;
    terminalOutput?: string;
  }> {
    return this.ipcRenderer.invoke("simple-expo:start", params);
  }

  public async simpleExpoStop(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("simple-expo:stop");
  }

  public async simpleExpoMetroRecovery(): Promise<{ success: boolean; portFree: boolean; message: string }> {
    return this.ipcRenderer.invoke("simple-expo:metro-recovery");
  }

  public async simpleExpoUpdatePackages(params: { appId: number }): Promise<{ success: boolean; output: string; message: string }> {
    return this.ipcRenderer.invoke("simple-expo:update-packages", params);
  }

  // Parallel App Creation Methods
  public async createAppInstant(params: {
    name: string;
    displayName?: string;
    packageId?: string;
    slug?: string;
    appType: 'web' | 'mobile';
    framework: 'web' | 'expo' | 'flutter';
    prompt?: string;
    attachments?: any[];
  }): Promise<{
    app: any;
    chatId: number;
    taskId: string;
    readyForChat: boolean;
  }> {
    return this.ipcRenderer.invoke("create-app-instant", params);
  }

  public async getAppCreationStatus(taskId: string): Promise<{
    status: 'running' | 'completed' | 'error';
    progress: number;
    message: string;
    error?: any;
    appId?: number;
  }> {
    return this.ipcRenderer.invoke("get-app-creation-status", taskId);
  }

  public async cleanupAppCreationTask(taskId: string): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("cleanup-app-creation-task", taskId);
  }

  // Design Generation Methods
  public async generateAppIcons(options: {
    prompt: string;
    model?: 'gpt-image-1' | 'dall-e-3' | 'dall-e-2';
    size?: string;
    quality?: string;
    numImages?: number;
    style?: 'vivid' | 'natural';
  }): Promise<any[]> {
    return this.ipcRenderer.invoke("generate-app-icons", options);
  }

  public async generateGeminiIcons(options: {
    prompt: string;
    model?: 'gemini-2.5-flash-image';
    size?: string;
    numImages?: number;
  }): Promise<any[]> {
    return this.ipcRenderer.invoke("generate-gemini-icons", options);
  }

  public async generatePlatformIcons(appDescription: string): Promise<{
    ios: any[];
    android: any[];
    universal: any[];
  }> {
    return this.ipcRenderer.invoke("generate-platform-icons", appDescription);
  }

  public async generateUIDesigns(options: {
    appDescription: string;
    style?: string;
    platform?: string;
    inspiration?: string;
  }): Promise<any[]> {
    return this.ipcRenderer.invoke("generate-ui-designs", options);
  }

  public async generateAppTypeDesigns(appType: string, appDescription: string): Promise<any[]> {
    return this.ipcRenderer.invoke("generate-app-type-designs", appType, appDescription);
  }

  // Auto-generate icons and UI designs based on app prompt
  public async autoGenerateAppAssets(appPrompt: string, appId: number): Promise<{
    icons: any[];
    uiDesigns: any[];
  }> {
    return this.ipcRenderer.invoke("auto-generate-app-assets", appPrompt, appId);
  }

  public async applyIconToApp(params: { appId: number; iconPath: string }): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("apply-icon-to-app", params);
  }

  public async applyUIDesignToApp(params: { appId: number; design: any }): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("apply-ui-design-to-app", params);
  }

  public async simpleExpoStatus(): Promise<{
    isRunning: boolean;
    webUrl: string;
    qrUrl: string;
    lanUrl: string;
    tunnelUrl: string;
    terminalOutput: string;
  }> {
    return this.ipcRenderer.invoke("simple-expo:status");
  }

  public async simpleExpoInput(input: string): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("simple-expo:input", { input });
  }

  public async simpleExpoCheckTools(): Promise<{
    success: boolean;
    availability?: {
      node: boolean;
      npm: boolean;
      npx: boolean;
      expo: boolean;
      paths: {
        node: string;
        npm: string;
        npx: string;
        expo: string;
      };
    };
    error?: string;
  }> {
    return this.ipcRenderer.invoke("simple-expo:check-tools");
  }

  // Playwright MCP Integration
  async startPlaywrightMCPServer(port?: number): Promise<{ success: boolean; port: number; error?: string }> {
    return this.ipcRenderer.invoke("playwright-mcp:start-server", { port });
  }

  async stopPlaywrightMCPServer(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("playwright-mcp:stop-server");
  }

  async runPlaywrightTest(params: { appId: number; appUrl: string; testType?: 'smoke' | 'full' | 'accessibility' }): Promise<{
    success: boolean;
    screenshots: string[];
    errors: string[];
    performance: { loadTime: number; networkRequests: number };
    accessibility: { violations: number; warnings: number };
  }> {
    return this.ipcRenderer.invoke("playwright-mcp:run-test", params);
  }

  async getPlaywrightMCPStatus(): Promise<{ running: boolean; port: number | null; uptime?: number }> {
    return this.ipcRenderer.invoke("playwright-mcp:status");
  }

  // Gemini methods removed for MVP



  // Background Task Management
  public async createAppBackground(params: any): Promise<{ taskId: string; app: any; chatId: number }> {
    return this.ipcRenderer.invoke("create-app-background", params);
  }

  public async getBackgroundTasks(): Promise<any[]> {
    return this.ipcRenderer.invoke("background-tasks:list");
  }

  public async getBackgroundTask(taskId: string): Promise<any> {
    return this.ipcRenderer.invoke("background-tasks:get", taskId);
  }

  public async cancelBackgroundTask(taskId: string): Promise<boolean> {
    return this.ipcRenderer.invoke("background-tasks:cancel", taskId);
  }

  public async cleanupBackgroundTasks(maxAge?: number): Promise<number> {
    return this.ipcRenderer.invoke("background-tasks:cleanup", maxAge);
  }

  // 🌍 Global Container Management with Transformers.js
  public async createContainer(params: {
    appId: string;
    appType: 'web' | 'mobile' | 'flutter';
    region?: string;
    config?: any;
  }): Promise<{
    success: boolean;
    containerId?: string;
    region?: any;
    config?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:create", params);
  }

  public async getContainerStatus(containerId: string): Promise<{
    success: boolean;
    status?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:status", { containerId });
  }

  public async stopContainer(containerId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:stop", { containerId });
  }

  public async restartContainer(containerId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:restart", { containerId });
  }

  public async listContainers(): Promise<{
    success: boolean;
    containers?: any[];
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:list", {});
  }

  public async deployGlobally(params: {
    appId: string;
    appType: 'web' | 'mobile' | 'flutter';
  }): Promise<{
    success: boolean;
    deployments?: any[];
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:deploy-global", params);
  }

  public async getAvailableRegions(): Promise<{
    success: boolean;
    regions?: any[];
    currentRegion?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:regions", {});
  }

  public async switchRegion(regionId: string): Promise<{
    success: boolean;
    currentRegion?: any;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:switch-region", { regionId });
  }

  public async getGlobalHealthStatus(): Promise<{
    success: boolean;
    healthStatus?: any[];
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:health-global", {});
  }

  public async getBuddyStatus(containerId: string): Promise<{
    success: boolean;
    buddyStatus?: any;
    containerStatus?: any;
    integration?: any;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:buddy-status", { containerId });
  }

  public async updateContainerConfig(params: {
    containerId: string;
    config: any;
  }): Promise<{
    success: boolean;
    oldContainerId?: string;
    newContainerId?: string;
    config?: any;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:update-config", params);
  }

  // 🎤 Native Speech Recognition Methods
  public async startNativeSpeechRecognition(options: {
    language?: string;
    continuous?: boolean;
    timeout?: number;
  } = {}): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("speech:start-native", options);
  }

  public async stopNativeSpeechRecognition(): Promise<{ success: boolean }> {
    return this.ipcRenderer.invoke("speech:stop-native");
  }

  public async checkNativeSpeechSupport(): Promise<{
    supported: boolean;
    platform: string;
    reason: string;
  }> {
    return this.ipcRenderer.invoke("speech:check-native-support");
  }

  public async getContainerMetrics(params: {
    containerId: string;
    timeRange?: string;
  }): Promise<{
    success: boolean;
    metrics?: any;
    timeRange?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("container:metrics", params);
  }

  public async getRunningTasksCount(): Promise<number> {
    return this.ipcRenderer.invoke("background-tasks:running-count");
  }

  // Hermetic Runtime Management
  public async verifyHermeticRuntime(): Promise<{
    node20: boolean;
    pnpm: boolean;
    npm: boolean;
    yarn: boolean;
  }> {
    return this.ipcRenderer.invoke("hermetic-runtime:verify");
  }

  public async getBestPackageManager(cwd?: string): Promise<"pnpm" | "yarn" | "npm"> {
    return this.ipcRenderer.invoke("hermetic-runtime:get-package-manager", cwd);
  }

  public async ensurePnpmAvailable(): Promise<boolean> {
    return this.ipcRenderer.invoke("hermetic-runtime:ensure-pnpm");
  }

  // EAS Integration Methods
  public async getEASStatus(): Promise<EASStatus> {
    return this.ipcRenderer.invoke("eas:status");
  }

  public async loginToEAS(): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("eas:login");
  }

  public async loginToEASWithToken(params: {
    token: string;
  }): Promise<{ success: boolean; username?: string; error?: string }> {
    return this.ipcRenderer.invoke("eas:login-token", params);
  }

  public async buildWithEAS(params: {
    appId: number;
    platform?: "all" | "ios" | "android";
  }): Promise<EASBuildResult> {
    return this.ipcRenderer.invoke("eas:build", params);
  }

  public async deployWithEAS(params: {
    appId: number;
  }): Promise<EASDeployResult> {
    return this.ipcRenderer.invoke("eas:deploy", params);
  }

  public async getEASBuildStatus(params: {
    buildId: string;
  }): Promise<EASBuildStatus> {
    return this.ipcRenderer.invoke("eas:build-status", params);
  }

  public async listEASProjects(): Promise<{
    success: boolean;
    projects: EASProject[];
    error?: string;
  }> {
    return this.ipcRenderer.invoke("eas:list-projects");
  }

  public async checkEASAppReadiness(params: {
    appId: number;
  }): Promise<{
    success: boolean;
    isExpoApp?: boolean;
    isEASConfigured?: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("eas:check-app-readiness", params);
  }

  public async checkEASKeystores(params: {
    appId: number;
  }): Promise<{ success: boolean; android?: boolean; ios?: boolean; both?: boolean; error?: string }> {
    return this.ipcRenderer.invoke("eas:check-keystores", params);
  }

  public async setupEASKeystores(params: {
    appId: number;
    platforms: string[];
  }): Promise<{ success: boolean; results?: Array<{ platform: string; success: boolean; error?: string }>; message?: string; error?: string }> {
    return this.ipcRenderer.invoke("eas:setup-keystores", params);
  }

  // Local Build Methods
  public async buildAndroidAPK(params: { appId: number }): Promise<LocalBuildResult> {
    return this.ipcRenderer.invoke("local-build:android-apk", params);
  }

  public async buildAndroidAAB(params: { appId: number }): Promise<LocalBuildResult> {
    return this.ipcRenderer.invoke("local-build:android-aab", params);
  }

  public async buildIOSIPA(params: { appId: number }): Promise<LocalBuildResult> {
    return this.ipcRenderer.invoke("local-build:ios-ipa", params);
  }

  public async getLocalBuildStatus(): Promise<LocalBuildStatus> {
    return this.ipcRenderer.invoke("local-build:status");
  }

  public async cancelLocalBuild(): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("local-build:cancel");
  }


  // URL Management
  public async saveDeploymentUrl(params: {
    appId: number;
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment';
    url: string;
    projectId?: string;
    buildId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("url:save-deployment", params);
  }

  public async getDeploymentUrls(params: {
    appId: number;
  }): Promise<{ success: boolean; deployments?: Array<{ type: string; name: string; url: string; projectId?: string; buildId?: string; lastDeploymentAt?: Date }>; error?: string }> {
    return this.ipcRenderer.invoke("url:get-deployments", params);
  }

  public async deleteDeploymentUrl(params: {
    appId: number;
    urlType: 'vercel' | 'github' | 'eas-build' | 'eas-deployment';
  }): Promise<{ success: boolean; error?: string }> {
    return this.ipcRenderer.invoke("url:delete-deployment", params);
  }

  // WordPress Authentication Methods
  public async wordpressCheckConfiguration(): Promise<{
    isConfigured: boolean;
    source: 'environment' | 'none' | 'error';
    hasUrl?: boolean;
    hasApplicationPassword?: boolean;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("wordpress:check-configuration");
  }

  public async wordpressLogin(params: { username: string; password: string }): Promise<{
    success: boolean;
    user?: any;
    token?: string;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("wordpress:login", params);
  }

  public async wordpressRegister(params: { username: string; email: string; password: string; first_name: string; last_name: string }): Promise<{
    success: boolean;
    user_id?: number;
    username?: string;
    email?: string;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("wordpress:register", params);
  }

  public async wordpressLogout(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("wordpress:logout");
  }

  public async wordpressGetCurrentUser(): Promise<{
    isAuthenticated: boolean;
    user: any;
    token: string | null;
  }> {
    return this.ipcRenderer.invoke("wordpress:get-current-user");
  }

  public async wordpressCheckCapability(params: { capability: string }): Promise<{
    hasCapability: boolean;
  }> {
    return this.ipcRenderer.invoke("wordpress:check-capability", params);
  }

  public async wordpressValidateSession(): Promise<{
    isValid: boolean;
  }> {
    return this.ipcRenderer.invoke("wordpress:validate-session");
  }

  public async wordpressOAuthLogin(params: { provider: string }): Promise<{
    success: boolean;
    oauthUrl?: string;
    message?: string;
    error?: string;
  }> {
    return this.ipcRenderer.invoke("wordpress:oauth-login", params);
  }
}

// Export singleton instance
export const ipcClient = IpcClient.getInstance();
