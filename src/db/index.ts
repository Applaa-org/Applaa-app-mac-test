// db.ts
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import { getDyadAppPath, getUserDataPath } from "../paths/paths";
import log from "electron-log";

const logger = log.scope("db");

// Database connection factory
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Ensure core tables exist in the database - critical for app functionality
 */
function ensureCoreTables(sqlite: Database.Database): void {
  // Check if apps table exists
  const appsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='apps'
  `).get();
  
  if (!appsTableExists) {
    logger.log("Creating apps table...");
    sqlite.prepare(`
      CREATE TABLE apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        github_org TEXT,
        github_repo TEXT,
        github_branch TEXT,
        supabase_project_id TEXT,
        neon_project_id TEXT,
        neon_development_branch_id TEXT,
        neon_preview_branch_id TEXT,
        vercel_project_id TEXT,
        vercel_project_name TEXT,
        vercel_team_id TEXT,
        vercel_deployment_url TEXT,
        github_repo_url TEXT,
        deployment_status TEXT DEFAULT 'not_deployed',
        last_deployment_at INTEGER,
        deployment_notes TEXT,
        chat_context TEXT,
        app_type TEXT DEFAULT 'web'
      )
    `).run();
    logger.log("Successfully created apps table");
  }

  // Check if chats table exists
  const chatsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='chats'
  `).get();
  
  if (!chatsTableExists) {
    logger.log("Creating chats table...");
    sqlite.prepare(`
      CREATE TABLE chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        title TEXT,
        initial_commit_hash TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
      )
    `).run();
    logger.log("Successfully created chats table");
  }

  // Check if messages table exists
  const messagesTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='messages'
  `).get();
  
  if (!messagesTableExists) {
    logger.log("Creating messages table...");
    sqlite.prepare(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        approval_state TEXT CHECK (approval_state IN ('approved', 'rejected')),
        commit_hash TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
      )
    `).run();
    logger.log("Successfully created messages table");
  }

  // Check if versions table exists
  const versionsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='versions'
  `).get();
  
  if (!versionsTableExists) {
    logger.log("Creating versions table...");
    sqlite.prepare(`
      CREATE TABLE versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        commit_hash TEXT NOT NULL,
        neon_db_timestamp TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE,
        UNIQUE (app_id, commit_hash)
      )
    `).run();
    logger.log("Successfully created versions table");
  }

  // Check if prompts table exists
  const promptsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='prompts'
  `).get();
  
  if (!promptsTableExists) {
    logger.log("Creating prompts table...");
    sqlite.prepare(`
      CREATE TABLE prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        category TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `).run();
    logger.log("Successfully created prompts table");
  }

  // Check if language_model_providers table exists
  const languageModelProvidersTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='language_model_providers'
  `).get();
  
  if (!languageModelProvidersTableExists) {
    logger.log("Creating language_model_providers table...");
    sqlite.prepare(`
      CREATE TABLE language_model_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_base_url TEXT NOT NULL,
        env_var_name TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `).run();
    logger.log("Successfully created language_model_providers table");
  }

  // Check if language_models table exists
  const languageModelsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='language_models'
  `).get();
  
  if (!languageModelsTableExists) {
    logger.log("Creating language_models table...");
    sqlite.prepare(`
      CREATE TABLE language_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        display_name TEXT NOT NULL,
        api_name TEXT NOT NULL,
        builtin_provider_id TEXT,
        custom_provider_id TEXT,
        description TEXT,
        max_output_tokens INTEGER,
        context_window INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (custom_provider_id) REFERENCES language_model_providers (id) ON DELETE CASCADE
      )
    `).run();
    logger.log("Successfully created language_models table");
  }

  // Check if context_documents table exists (for vector store/semantic search)
  const contextDocumentsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='context_documents'
  `).get();
  
  if (!contextDocumentsTableExists) {
    logger.log("Creating context_documents table...");
    sqlite.prepare(`
      CREATE TABLE context_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        tokens INTEGER DEFAULT 0,
        language TEXT,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(app_id, file_path)
      )
    `).run();
    
    // Create indexes
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_documents_app_id ON context_documents(app_id)`).run();
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_documents_file_path ON context_documents(file_path)`).run();
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_documents_language ON context_documents(language)`).run();
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_documents_updated_at ON context_documents(updated_at)`).run();
    
    logger.log("Successfully created context_documents table with indexes");
  }

  // Check if context_usage table exists
  const contextUsageTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='context_usage'
  `).get();
  
  if (!contextUsageTableExists) {
    logger.log("Creating context_usage table...");
    sqlite.prepare(`
      CREATE TABLE context_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        query_text TEXT NOT NULL,
        similarity REAL NOT NULL,
        accepted BOOLEAN NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES context_documents (id) ON DELETE CASCADE
      )
    `).run();
    
    // Create indexes
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_usage_document_id ON context_usage(document_id)`).run();
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_usage_accepted ON context_usage(accepted)`).run();
    sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_context_usage_created_at ON context_usage(created_at)`).run();
    
    logger.log("Successfully created context_usage table with indexes");
  }

  // Check if context_analytics table exists
  const contextAnalyticsTableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='context_analytics'
  `).get();
  
  if (!contextAnalyticsTableExists) {
    logger.log("Creating context_analytics table...");
    sqlite.prepare(`
      CREATE TABLE context_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        acceptance_rate REAL DEFAULT 0.0,
        avg_similarity REAL DEFAULT 0.0,
        last_used_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(app_id, file_path)
      )
    `).run();
    
    logger.log("Successfully created context_analytics table");
  }

  logger.log("✅ All core tables verified/created successfully");
}

/**
 * Ensure critical columns exist in the database for app functionality
 */
function ensureCriticalColumns(sqlite: Database.Database): void {
  // Check if app_type column exists in apps table
  const tableInfo = sqlite.prepare("PRAGMA table_info(apps)").all() as Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
  }>;
  
  const hasAppType = tableInfo.some(col => col.name === 'app_type');
  const hasStatus = tableInfo.some(col => col.name === 'status');
  const hasDisplayName = tableInfo.some(col => col.name === 'display_name');
  const hasPackageId = tableInfo.some(col => col.name === 'package_id');
  const hasSlug = tableInfo.some(col => col.name === 'slug');
  const hasGithubOrg = tableInfo.some(col => col.name === 'github_org');
  const hasGithubRepo = tableInfo.some(col => col.name === 'github_repo');
  const hasGithubBranch = tableInfo.some(col => col.name === 'github_branch');
  const hasVercelDeploymentUrl = tableInfo.some(col => col.name === 'vercel_deployment_url');
  const hasGithubRepoUrl = tableInfo.some(col => col.name === 'github_repo_url');
  const hasDeploymentStatus = tableInfo.some(col => col.name === 'deployment_status');
  const hasLastDeploymentAt = tableInfo.some(col => col.name === 'last_deployment_at');
  const hasDeploymentNotes = tableInfo.some(col => col.name === 'deployment_notes');
  const hasChatContext = tableInfo.some(col => col.name === 'chat_context');
  const hasEasBuildUrl = tableInfo.some(col => col.name === 'eas_build_url');
  const hasEasDeploymentUrl = tableInfo.some(col => col.name === 'eas_deployment_url');
  const hasEasProjectId = tableInfo.some(col => col.name === 'eas_project_id');
  const hasEasBuildId = tableInfo.some(col => col.name === 'eas_build_id');
  // Local build file columns
  const hasLocalApkPath = tableInfo.some(col => col.name === 'local_apk_path');
  const hasLocalAabPath = tableInfo.some(col => col.name === 'local_aab_path');
  const hasLocalIpaPath = tableInfo.some(col => col.name === 'local_ipa_path');
  const hasLocalApkBuiltAt = tableInfo.some(col => col.name === 'local_apk_built_at');
  const hasLocalAabBuiltAt = tableInfo.some(col => col.name === 'local_aab_built_at');
  const hasLocalIpaBuiltAt = tableInfo.some(col => col.name === 'local_ipa_built_at');
  
  if (!hasAppType) {
    logger.log("Adding missing app_type column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN app_type TEXT DEFAULT 'web'").run();
    logger.log("Successfully added app_type column");
  }
  
  // 🚀 PERFORMANCE: Add status column for parallel app creation
  if (!hasStatus) {
    logger.log("Adding missing status column to apps table for parallel app creation");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN status TEXT DEFAULT 'ready'").run();
    logger.log("Successfully added status column - parallel app creation enabled!");
  }
  
  // 🏷️ USER EXPERIENCE: Add display name columns for better app naming
  if (!hasDisplayName) {
    logger.log("Adding missing display_name column to apps table for user-friendly names");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN display_name TEXT").run();
    logger.log("Successfully added display_name column - user-friendly app names enabled!");
  }
  
  if (!hasPackageId) {
    logger.log("Adding missing package_id column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN package_id TEXT").run();
    logger.log("Successfully added package_id column");
  }
  
  if (!hasSlug) {
    logger.log("Adding missing slug column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN slug TEXT").run();
    logger.log("Successfully added slug column");
  }
  
  // 🔗 DEPLOYMENT: Ensure GitHub and Vercel URL columns exist
  if (!hasGithubOrg) {
    logger.log("Adding missing github_org column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN github_org TEXT").run();
    logger.log("Successfully added github_org column");
  }
  
  if (!hasGithubRepo) {
    logger.log("Adding missing github_repo column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN github_repo TEXT").run();
    logger.log("Successfully added github_repo column");
  }
  
  if (!hasGithubBranch) {
    logger.log("Adding missing github_branch column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN github_branch TEXT").run();
    logger.log("Successfully added github_branch column");
  }
  
  if (!hasVercelDeploymentUrl) {
    logger.log("Adding missing vercel_deployment_url column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN vercel_deployment_url TEXT").run();
    logger.log("Successfully added vercel_deployment_url column");
  }
  
  // 🔗 NEW DEPLOYMENT FIELDS: Add new deployment tracking fields
  if (!hasGithubRepoUrl) {
    logger.log("Adding missing github_repo_url column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN github_repo_url TEXT").run();
    logger.log("Successfully added github_repo_url column");
  }
  
  if (!hasDeploymentStatus) {
    logger.log("Adding missing deployment_status column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN deployment_status TEXT DEFAULT 'not_deployed'").run();
    logger.log("Successfully added deployment_status column");
  }
  
  if (!hasLastDeploymentAt) {
    logger.log("Adding missing last_deployment_at column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN last_deployment_at INTEGER").run();
    logger.log("Successfully added last_deployment_at column");
  }
  
  if (!hasDeploymentNotes) {
    logger.log("Adding missing deployment_notes column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN deployment_notes TEXT").run();
    logger.log("Successfully added deployment_notes column");
  }
  
  if (!hasChatContext) {
    logger.log("Adding missing chat_context column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN chat_context TEXT").run();
    logger.log("Successfully added chat_context column");
  }
  
  // 🚀 EAS INTEGRATION: Add EAS deployment URL columns
  if (!hasEasBuildUrl) {
    logger.log("Adding missing eas_build_url column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN eas_build_url TEXT").run();
    logger.log("Successfully added eas_build_url column");
  }
  
  if (!hasEasDeploymentUrl) {
    logger.log("Adding missing eas_deployment_url column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN eas_deployment_url TEXT").run();
    logger.log("Successfully added eas_deployment_url column");
  }
  
  if (!hasEasProjectId) {
    logger.log("Adding missing eas_project_id column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN eas_project_id TEXT").run();
    logger.log("Successfully added eas_project_id column");
  }
  
  if (!hasEasBuildId) {
    logger.log("Adding missing eas_build_id column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN eas_build_id TEXT").run();
    logger.log("Successfully added eas_build_id column");
  }
  
  // 🔨 LOCAL BUILD: Add local build file columns
  if (!hasLocalApkPath) {
    logger.log("Adding missing local_apk_path column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_apk_path TEXT").run();
    logger.log("Successfully added local_apk_path column");
  }
  
  if (!hasLocalAabPath) {
    logger.log("Adding missing local_aab_path column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_aab_path TEXT").run();
    logger.log("Successfully added local_aab_path column");
  }
  
  if (!hasLocalIpaPath) {
    logger.log("Adding missing local_ipa_path column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_ipa_path TEXT").run();
    logger.log("Successfully added local_ipa_path column");
  }
  
  if (!hasLocalApkBuiltAt) {
    logger.log("Adding missing local_apk_built_at column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_apk_built_at INTEGER").run();
    logger.log("Successfully added local_apk_built_at column");
  }
  
  if (!hasLocalAabBuiltAt) {
    logger.log("Adding missing local_aab_built_at column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_aab_built_at INTEGER").run();
    logger.log("Successfully added local_aab_built_at column");
  }
  
  if (!hasLocalIpaBuiltAt) {
    logger.log("Adding missing local_ipa_built_at column to apps table");
    sqlite.prepare("ALTER TABLE apps ADD COLUMN local_ipa_built_at INTEGER").run();
    logger.log("Successfully added local_ipa_built_at column");
  }
}

/**
 * Get the database path based on the current environment
 */
export function getDatabasePath(): string {
  return path.join(getUserDataPath(), "sqlite.db");
}

/**
 * Initialize the database connection
 */
export function initializeDatabase(): BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
} {
  if (_db) return _db as any;

  const dbPath = getDatabasePath();
  logger.log("Initializing database at:", dbPath);

  // Check if the database file exists and remove it if it has issues
  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      if (stats.size < 100) {
        logger.log("Database file exists but may be corrupted. Removing it...");
        fs.unlinkSync(dbPath);
      }
    }
  } catch (error) {
    logger.error("Error checking database file:", error);
  }

  fs.mkdirSync(getUserDataPath(), { recursive: true });
  fs.mkdirSync(getDyadAppPath("."), { recursive: true });

  const sqlite = new Database(dbPath, { timeout: 10000 });
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });

  try {
    const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");
    if (!fs.existsSync(migrationsFolder)) {
      logger.warn("Migrations folder not found:", migrationsFolder, "- continuing without migrations");
    } else {
      logger.log("Running migrations from:", migrationsFolder);
      migrate(_db, { migrationsFolder });
      logger.log("Database migrations completed successfully");
    }
  } catch (error) {
    logger.warn("Migration failed, but continuing app startup:", error.message);
    logger.log("Core app functionality will work with basic database schema");
    
    // Don't try to add problematic columns - just let the app work with basic schema
    // The fallback queries in app_handlers.ts will handle missing columns gracefully
    
    // Don't throw - allow app to continue even if migrations fail
    // This ensures core functionality works even with database issues
  }

  // Ensure critical columns exist for app functionality
  try {
    ensureCriticalColumns(sqlite);
  } catch (error) {
    logger.warn("Failed to ensure critical columns:", error.message);
  }

  // 🚀 CRITICAL FIX: Ensure core tables exist even if migrations fail
  try {
    ensureCoreTables(sqlite);
  } catch (error) {
    logger.error("Failed to ensure core tables:", error.message);
    // This is critical - if core tables don't exist, the app won't work
    throw new Error(`Database initialization failed: ${error.message}`);
  }

  return _db as any;
}

/**
 * Get the database instance (throws if not initialized)
 */
export function getDb(): BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
} {
  if (!_db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return _db as any;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    const database = getDb();
    return database[prop as keyof typeof database];
  },
}) as BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};
