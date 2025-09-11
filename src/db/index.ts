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
