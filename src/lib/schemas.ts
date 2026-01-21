import { z } from "zod";

export const SecretSchema = z.object({
  value: z.string(),
  encryptionType: z.enum(["electron-safe-storage", "plaintext", "applaa-stable-v1"]).optional(),
});
export type Secret = z.infer<typeof SecretSchema>;

/**
 * Zod schema for chat summary objects returned by the get-chats IPC
 */
export const ChatSummarySchema = z.object({
  id: z.number(),
  appId: z.number(),
  title: z.string().nullable(),
  createdAt: z.date(),
});

/**
 * Type derived from the ChatSummarySchema
 */
export type ChatSummary = z.infer<typeof ChatSummarySchema>;

/**
 * Zod schema for an array of chat summaries
 */
export const ChatSummariesSchema = z.array(ChatSummarySchema);

/**
 * Zod schema for prompt library items
 */
export const PromptItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string(),
  category: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Type derived from the PromptItemSchema
 */
export type PromptItem = z.infer<typeof PromptItemSchema>;

/**
 * Zod schema for an array of prompt items
 */
export const PromptItemsSchema = z.array(PromptItemSchema);

const providers = [
  "openai",
  "anthropic",
  "google",
  "gemini",
  "auto",
  "openrouter",
  "ollama",
  "lmstudio",
] as const;

export const cloudProviders = providers.filter(
  (provider) => provider !== "ollama" && provider !== "lmstudio",
);

/**
 * Zod schema for large language model configuration
 */
export const LargeLanguageModelSchema = z.object({
  name: z.string(),
  provider: z.string(),
  customModelId: z.number().optional(),
});

/**
 * Type derived from the LargeLanguageModelSchema
 */
export type LargeLanguageModel = z.infer<typeof LargeLanguageModelSchema>;

/**
 * Zod schema for provider settings
 */
export const ProviderSettingSchema = z.object({
  apiKey: SecretSchema.optional(),
  apiBaseUrl: SecretSchema.optional(), // For Azure OpenAI and other providers that need custom endpoints
  resourceName: SecretSchema.optional(), // For Azure OpenAI resource name
  deploymentName: SecretSchema.optional(), // For Azure OpenAI deployment name
  apiVersion: SecretSchema.optional(), // For Azure OpenAI API version
  endpoint: SecretSchema.optional(), // For Azure OpenAI custom endpoint
});

/**
 * Type derived from the ProviderSettingSchema
 */
export type ProviderSetting = z.infer<typeof ProviderSettingSchema>;

export const RuntimeModeSchema = z.enum(["web-sandbox", "local-node", "unset"]);
export type RuntimeMode = z.infer<typeof RuntimeModeSchema>;

export const ChatModeSchema = z.enum(["build", "ask"]);
export type ChatMode = z.infer<typeof ChatModeSchema>;

export const GitHubSecretsSchema = z.object({
  accessToken: SecretSchema.nullable(),
});
export type GitHubSecrets = z.infer<typeof GitHubSecretsSchema>;

export const GithubUserSchema = z.object({
  email: z.string(),
});
export type GithubUser = z.infer<typeof GithubUserSchema>;

export const SupabaseSchema = z.object({
  accessToken: SecretSchema.optional(),
  refreshToken: SecretSchema.optional(),
  expiresIn: z.number().optional(),
  tokenTimestamp: z.number().optional(),
});
export type Supabase = z.infer<typeof SupabaseSchema>;

export const NeonSchema = z.object({
  accessToken: SecretSchema.optional(),
  refreshToken: SecretSchema.optional(),
  expiresIn: z.number().optional(),
  tokenTimestamp: z.number().optional(),
});
export type Neon = z.infer<typeof NeonSchema>;

export const GeminiAuthSchema = z.object({
  accessToken: SecretSchema.optional(),
  refreshToken: SecretSchema.optional(),
  expiresIn: z.number().optional(),
  tokenTimestamp: z.number().optional(),
  projectId: z.string().optional(), // For Vertex AI
  region: z.string().optional(), // For Vertex AI
  authMode: z.enum(["oauth", "adc"]).optional(), // OAuth or Application Default Credentials
});
export type GeminiAuth = z.infer<typeof GeminiAuthSchema>;

export const ExperimentsSchema = z.object({
  // Deprecated
  enableSupabaseIntegration: z.boolean().describe("DEPRECATED").optional(),
  enableFileEditing: z.boolean().describe("DEPRECATED").optional(),
});
export type Experiments = z.infer<typeof ExperimentsSchema>;

export const DyadProBudgetSchema = z.object({
  budgetResetAt: z.string(),
  maxBudget: z.number(),
});
export type DyadProBudget = z.infer<typeof DyadProBudgetSchema>;

export const GlobPathSchema = z.object({
  globPath: z.string(),
});

export type GlobPath = z.infer<typeof GlobPathSchema>;

export const AppChatContextSchema = z.object({
  contextPaths: z.array(GlobPathSchema),
  smartContextAutoIncludes: z.array(GlobPathSchema),
  excludePaths: z.array(GlobPathSchema).optional(),
});
export type AppChatContext = z.infer<typeof AppChatContextSchema>;

export type ContextPathResult = GlobPath & {
  files: number;
  tokens: number;
};

export type ContextPathResults = {
  contextPaths: ContextPathResult[];
  smartContextAutoIncludes: ContextPathResult[];
  excludePaths: ContextPathResult[];
};

export const ReleaseChannelSchema = z.enum(["stable", "beta"]);
export type ReleaseChannel = z.infer<typeof ReleaseChannelSchema>;

export const UserTierSchema = z.enum(["free", "pro", "ultra", "business"]);
export type UserTier = z.infer<typeof UserTierSchema>;

/**
 * Zod schema for user settings
 */
export const UserSettingsSchema = z.object({
  selectedModel: LargeLanguageModelSchema,
  providerSettings: z.record(z.string(), ProviderSettingSchema),
  githubUser: GithubUserSchema.optional(),
  githubAccessToken: SecretSchema.optional(),
  vercelAccessToken: SecretSchema.optional(),
  supabase: SupabaseSchema.optional(),
  neon: NeonSchema.optional(),
  gemini: GeminiAuthSchema.optional(),
  autoApproveChanges: z.boolean().optional(),
  telemetryConsent: z.enum(["opted_in", "opted_out", "unset"]).optional(),
  telemetryUserId: z.string().optional(),
  hasRunBefore: z.boolean().optional(),
  enableApplaaPro: z.boolean().optional(),
  userTier: UserTierSchema.optional(), // "free" or "pro" - defaults to "free"
  experiments: ExperimentsSchema.optional(),
  lastShownReleaseNotesVersion: z.string().optional(),
  maxChatTurnsInContext: z.number().optional(),
  thinkingBudget: z.enum(["low", "medium", "high"]).optional(),
  enableProLazyEditsMode: z.boolean().optional(),
  enableProSmartFilesContextMode: z.boolean().optional(),
  // Spark Features (Non-Pro efficiency features)
  enableSparkEditsMode: z.boolean().optional(),
  enableSparkContextMode: z.boolean().optional(),
  selectedTemplateId: z.string(),
  selectedPlatform: z.enum(["web", "expo", "flutter"]).optional(),
  customAppsDirectory: z.string().optional(),
  enableSupabaseWriteSqlMigration: z.boolean().optional(),
  selectedChatMode: ChatModeSchema.optional(),
  acceptedCommunityCode: z.boolean().optional(),

  enableAutoFixProblems: z.boolean().optional(),
  autoFixModel: LargeLanguageModelSchema.optional(), // Separate model for auto-fix operations
  enableNativeGit: z.boolean().optional(),
  enableAutoUpdate: z.boolean(),
  releaseChannel: ReleaseChannelSchema,

  // Semantic Context Settings
  semanticContextEnabled: z.boolean().optional(),
  semanticCrossAppEnabled: z.boolean().optional(),
  semanticAutoIndexEnabled: z.boolean().optional(),
  
  // AI Features Onboarding
  hasShownAIFeaturesDialog: z.boolean().optional(),
  aiTransformersInstalled: z.boolean().optional(),

  // Gemini Integration Settings
  enableGemini: z.boolean().optional(),
  enableGeminiCLI: z.boolean().optional(),

  // Cloudflare R2 Storage Settings
  cloudflareR2: z.object({
    accountId: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    bucketName: z.string().optional(),
    region: z.string().optional(),
  }).optional(),

  // Chat Stream Performance Settings
  enableStreamAutosave: z.boolean().optional(),

  // Game Window Settings
  enableGameWindowDuringStream: z.boolean().optional(),

  // UI State Settings
  deployedAppsSectionExpanded: z.boolean().optional(),

  // WordPress Authentication Settings
  wordpressAuth: z.object({
    isAuthenticated: z.boolean(),
    user: z.object({
      id: z.number(),
      username: z.string(),
      email: z.string(),
      display_name: z.string(),
      roles: z.array(z.string()),
      avatar_url: z.string().optional(),
      capabilities: z.array(z.string()),
    }).optional(),
    token: z.string().optional(),
    lastLogin: z.string().optional(),
  }).optional(),

  ////////////////////////////////
  // E2E TESTING ONLY.
  ////////////////////////////////
  isTestMode: z.boolean().optional(),

  ////////////////////////////////
  // DEPRECATED.
  ////////////////////////////////
  enableProSaverMode: z.boolean().optional(),
  dyadProBudget: DyadProBudgetSchema.optional(),
  runtimeMode: RuntimeModeSchema.optional(),
});

/**
 * Type derived from the UserSettingsSchema
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export function isApplaaProEnabled(settings: UserSettings): boolean {
  return settings.enableApplaaPro === true && hasApplaaProKey(settings);
}

export function hasApplaaProKey(settings: UserSettings): boolean {
  return !!settings.providerSettings?.auto?.apiKey?.value;
}

// Define interfaces for the props
export interface SecurityRisk {
  type: "warning" | "danger";
  title: string;
  description: string;
}

export interface FileChange {
  name: string;
  path: string;
  summary: string;
  type: "write" | "rename" | "delete";
  isServerFunction: boolean;
}

export interface CodeProposal {
  type: "code-proposal";
  title: string;
  securityRisks: SecurityRisk[];
  filesChanged: FileChange[];
  packagesAdded: string[];
  sqlQueries: SqlQuery[];
}

export type SuggestedAction =
  | RestartAppAction
  | SummarizeInNewChatAction
  | RefactorFileAction
  | WriteCodeProperlyAction
  | RebuildAction
  | RestartAction
  | RefreshAction
  | BoostMyAppAction;

export interface RestartAppAction {
  id: "restart-app";
}

export interface SummarizeInNewChatAction {
  id: "summarize-in-new-chat";
}

export interface WriteCodeProperlyAction {
  id: "write-code-properly";
}

export interface RefactorFileAction {
  id: "refactor-file";
  path: string;
}

export interface RebuildAction {
  id: "rebuild";
}

export interface RestartAction {
  id: "restart";
}

export interface RefreshAction {
  id: "refresh";
}

export interface BoostMyAppAction {
  id: "keep-going"; // Keep same ID for backward compatibility, but represents "Boost My App"
}

export interface ActionProposal {
  type: "action-proposal";
  actions: SuggestedAction[];
}

export interface TipProposal {
  type: "tip-proposal";
  title: string;
  description: string;
}

export type Proposal = CodeProposal | ActionProposal | TipProposal;

export interface ProposalResult {
  proposal: Proposal;
  chatId: number;
  messageId: number;
}

export interface SqlQuery {
  content: string;
  description?: string;
}
