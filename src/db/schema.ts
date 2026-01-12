import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, unique, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  // Enhanced naming fields temporarily disabled for MVP stability
  // displayName: text("display_name"),
  // packageId: text("package_id"),
  // slug: text("slug"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  githubOrg: text("github_org"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch"),
  supabaseProjectId: text("supabase_project_id"),
  neonProjectId: text("neon_project_id"),
  neonDevelopmentBranchId: text("neon_development_branch_id"),
  neonPreviewBranchId: text("neon_preview_branch_id"),
  vercelProjectId: text("vercel_project_id"),
  vercelProjectName: text("vercel_project_name"),
  vercelTeamId: text("vercel_team_id"),
  vercelDeploymentUrl: text("vercel_deployment_url"),
  githubRepoUrl: text("github_repo_url"),
  // EAS deployment URLs
  easBuildUrl: text("eas_build_url"),
  easDeploymentUrl: text("eas_deployment_url"),
  easProjectId: text("eas_project_id"),
  easBuildId: text("eas_build_id"),
  // Local build files
  localApkPath: text("local_apk_path"),
  localAabPath: text("local_aab_path"),
  localIpaPath: text("local_ipa_path"),
  localApkBuiltAt: integer("local_apk_built_at", { mode: "timestamp" }),
  localAabBuiltAt: integer("local_aab_built_at", { mode: "timestamp" }),
  localIpaBuiltAt: integer("local_ipa_built_at", { mode: "timestamp" }),
  deploymentStatus: text("deployment_status").default("not_deployed"),
  lastDeploymentAt: integer("last_deployment_at", { mode: "timestamp" }),
  deploymentNotes: text("deployment_notes"),
  showInHub: integer("show_in_hub", { mode: "boolean" }).default(false),
  chatContext: text("chat_context", { mode: "json" }),
  appType: text("app_type", { enum: ["web", "mobile", "godot", "arcade", "microbit", "minecraft", "blockly"] }).default("web"),
  promptHistory: text("prompt_history", { mode: "json" }), // Array of {role, text, ts}
  engineMetadata: text("engine_metadata", { mode: "json" }), // MakeCode/Blockly specific data
  status: text("status").default("ready"),
});

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  title: text("title"),
  initialCommitHash: text("initial_commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  approvalState: text("approval_state", {
    enum: ["approved", "rejected"],
  }),
  commitHash: text("commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const versions = sqliteTable(
  "versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    commitHash: text("commit_hash").notNull(),
    neonDbTimestamp: text("neon_db_timestamp"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // Unique constraint to prevent duplicate versions
    unique("versions_app_commit_unique").on(table.appId, table.commitHash),
  ],
);

// Define relations
export const appsRelations = relations(apps, ({ many }) => ({
  chats: many(chats),
  versions: many(versions),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const language_model_providers = sqliteTable(
  "language_model_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    api_base_url: text("api_base_url").notNull(),
    env_var_name: text("env_var_name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const language_models = sqliteTable("language_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  apiName: text("api_name").notNull(),
  builtinProviderId: text("builtin_provider_id"),
  customProviderId: text("custom_provider_id").references(
    () => language_model_providers.id,
    { onDelete: "cascade" },
  ),
  description: text("description"),
  max_output_tokens: integer("max_output_tokens"),
  context_window: integer("context_window"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relations for new tables
export const languageModelProvidersRelations = relations(
  language_model_providers,
  ({ many }) => ({
    languageModels: many(language_models),
  }),
);

export const languageModelsRelations = relations(
  language_models,
  ({ one }) => ({
    provider: one(language_model_providers, {
      fields: [language_models.customProviderId],
      references: [language_model_providers.id],
    }),
  }),
);

export const versionsRelations = relations(versions, ({ one }) => ({
  app: one(apps, {
    fields: [versions.appId],
    references: [apps.id],
  }),
}));

// ============================================================================
// APPLAA BUDDY - SUPER POWERS BROWSER TABLES
// ============================================================================

// Browser Tabs - Multi-tab management with per-tab chat
export const browserTabs = sqliteTable("browser_tabs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("New Tab"),
  url: text("url").notNull().default(""),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "cascade" }),
  faviconUrl: text("favicon_url"),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Chat Embeddings - Vector storage for RAG (Retrieval Augmented Generation)
export const chatEmbeddings = sqliteTable("chat_embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  embedding: text("embedding", { mode: "json" }).notNull(), // JSON array of floats
  embeddingModel: text("embedding_model").notNull().default("text-embedding-3-small"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// App Knowledge - Code, errors, and success patterns with embeddings
export const appKnowledge = sqliteTable("app_knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").references(() => apps.id, { onDelete: "cascade" }),
  contentType: text("content_type", {
    enum: ["code", "chat", "error", "success", "pattern"]
  }).notNull(),
  content: text("content").notNull(),
  embedding: text("embedding", { mode: "json" }).notNull(),
  metadata: text("metadata", { mode: "json" }), // {file_path, line_number, etc}
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Automation Plans - Store LLM-generated automation plans
export const automationPlans = sqliteTable("automation_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tabId: integer("tab_id").references(() => browserTabs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  goal: text("goal").notNull(), // User's original goal
  steps: text("steps", { mode: "json" }).notNull(), // Array of automation steps
  scriptType: text("script_type", {
    enum: ["playwright", "puppeteer", "manual"]
  }).notNull().default("playwright"),
  scriptContent: text("script_content"), // Generated script
  status: text("status", {
    enum: ["draft", "approved", "executing", "completed", "failed"]
  }).notNull().default("draft"),
  embedding: text("embedding", { mode: "json" }), // For plan similarity search
  executionLog: text("execution_log", { mode: "json" }), // Execution results
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// BUDDY PERSISTENT MEMORY TABLES
// ============================================================================

export const buddyConversations = sqliteTable("buddy_conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const buddyMessages = sqliteTable("buddy_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => buddyConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const buddyMessageEmbeddings = sqliteTable("buddy_message_embeddings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: text("message_id")
    .notNull()
    .unique()
    .references(() => buddyMessages.id, { onDelete: "cascade" }),
  embedding: blob("embedding", { mode: "buffer" }).notNull(),
  modelVersion: text("model_version").default("all-MiniLM-L6-v2"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Relations for tables
export const browserTabsRelations = relations(browserTabs, ({ one, many }) => ({
  chat: one(chats, {
    fields: [browserTabs.chatId],
    references: [chats.id],
  }),
  automationPlans: many(automationPlans),
}));

export const chatEmbeddingsRelations = relations(chatEmbeddings, ({ one }) => ({
  message: one(messages, {
    fields: [chatEmbeddings.messageId],
    references: [messages.id],
  }),
}));

export const appKnowledgeRelations = relations(appKnowledge, ({ one }) => ({
  app: one(apps, {
    fields: [appKnowledge.appId],
    references: [apps.id],
  }),
}));

export const automationPlansRelations = relations(automationPlans, ({ one }) => ({
  tab: one(browserTabs, {
    fields: [automationPlans.tabId],
    references: [browserTabs.id],
  }),
}));

export const buddyConversationsRelations = relations(buddyConversations, ({ many }) => ({
  messages: many(buddyMessages),
}));

export const buddyMessagesRelations = relations(buddyMessages, ({ one }) => ({
  conversation: one(buddyConversations, {
    fields: [buddyMessages.conversationId],
    references: [buddyConversations.id],
  }),
  embedding: one(buddyMessageEmbeddings, {
    fields: [buddyMessages.id],
    references: [buddyMessageEmbeddings.messageId],
  }),
}));

export const buddyMessageEmbeddingsRelations = relations(buddyMessageEmbeddings, ({ one }) => ({
  message: one(buddyMessages, {
    fields: [buddyMessageEmbeddings.messageId],
    references: [buddyMessages.id],
  }),
}));

// Prompts table temporarily disabled for MVP
// export const prompts = sqliteTable("prompts", {
//   id: integer("id").primaryKey({ autoIncrement: true }),
//   title: text("title").notNull(),
//   description: text("description"),
//   content: text("content").notNull(),
//   category: text("category").default("General"),
//   createdAt: integer("created_at", { mode: "timestamp" })
//     .notNull()
//     .default(sql`(unixepoch())`),
//   updatedAt: integer("updated_at", { mode: "timestamp" })
//     .notNull()
//     .default(sql`(unixepoch())`),
// });
