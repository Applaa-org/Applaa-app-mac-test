import fs from "node:fs";
import path from "node:path";
import type { PoolClient, Pool } from "pg";
import { pool } from "../db/pool";
import { detectAppType, getSchemaTemplate, type AppSchemaTemplate } from "../schemas/app-templates";
import { generateDatabasePassword, sanitizeDatabaseName } from "../utils/password-generator";

export interface ProvisionedDatabase {
  schemaName: string;
  connectionString: string;
  appId: number;
}

export interface DedicatedDatabase {
  databaseName: string;
  dbUser: string;
  dbPassword: string;
  connectionString: string;
  host: string;
  port: number;
  canConnectExternally: boolean;
  appId: number;
}

export async function provisionAppDatabase(
  appId: number,
  appName: string,
  appType: "web" | "mobile" | "godot" = "web",
  providedClient?: PoolClient,
): Promise<ProvisionedDatabase> {
  const client = providedClient || await pool.connect();
  const shouldReleaseClient = !providedClient;

  try {
    if (!providedClient) {
      await client.query("BEGIN");
    }

    const sanitizedName = appName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const schemaName = `app_${appId}_${sanitizedName}`;

    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    await runBaseMigrations(client, schemaName);

    const connectionString = buildConnectionString(schemaName);

    await client.query(
      `INSERT INTO core.app_databases (app_id, schema_name, connection_string, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (app_id) DO UPDATE
       SET schema_name = EXCLUDED.schema_name,
           connection_string = EXCLUDED.connection_string,
           updated_at = NOW()`,
      [appId, schemaName, connectionString],
    );

    if (!providedClient) {
      await client.query("COMMIT");
    }

    return {
      schemaName,
      connectionString,
      appId,
    };
  } catch (err) {
    if (!providedClient) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
}

/**
 * Provision a DEDICATED database for an app (not just a schema)
 * This allows users to connect externally with their own credentials
 * 
 * @param appId App ID
 * @param appName App name
 * @param userId User ID (for namespacing)
 * @param providedClient Optional existing database client
 * @returns Dedicated database info with credentials
 */
export async function provisionDedicatedDatabase(
  appId: number,
  appName: string,
  userId: number = 1, // Default to 1 for now, will be from auth later
  providedClient?: PoolClient,
): Promise<DedicatedDatabase> {
  const client = providedClient || await pool.connect();
  const shouldReleaseClient = !providedClient;

  try {
    if (!providedClient) {
      await client.query("BEGIN");
    }

    // Generate unique database and user names
    const sanitizedName = sanitizeDatabaseName(appName);
    const databaseName = `applaa_u${userId}_app${appId}_${sanitizedName}`.substring(0, 63);
    const dbUser = `user_${userId}_app_${appId}`.substring(0, 63);
    const dbPassword = generateDatabasePassword(32);

    console.log(`[DB] Provisioning dedicated database: ${databaseName}`);
    console.log(`[DB] Creating user: ${dbUser}`);

    // Create dedicated database
    await client.query(`CREATE DATABASE ${databaseName}`);
    console.log(`[DB] ✅ Database created: ${databaseName}`);

    // Create dedicated user with password
    await client.query(
      `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`
    );
    console.log(`[DB] ✅ User created: ${dbUser}`);

    // Grant all privileges on the database to the user
    await client.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${databaseName} TO ${dbUser}`
    );
    console.log(`[DB] ✅ Privileges granted`);

    // Connect to the new database to set up base schema
    const { Pool: PgPool } = await import("pg");
    const newDbPool = new PgPool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
      database: databaseName,
      user: dbUser,
      password: dbPassword,
      max: 5,
    });

    try {
      // Run base migrations on the new database
      const newClient = await newDbPool.connect();
      try {
        await runBaseMigrationsOnDatabase(newClient);
        console.log(`[DB] ✅ Base schema created in ${databaseName}`);
      } finally {
        newClient.release();
      }
    } finally {
      await newDbPool.end();
    }

    // Build connection string
    const host = process.env.POSTGRES_HOST || "localhost";
    const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);
    const connectionString = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(
      dbPassword,
    )}@${host}:${port}/${databaseName}`;

    // Store in core.app_databases
    await client.query(
      `INSERT INTO core.app_databases (
        app_id, 
        database_name, 
        db_user, 
        db_password, 
        connection_string, 
        can_connect_externally, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (app_id) DO UPDATE
      SET database_name = EXCLUDED.database_name,
          db_user = EXCLUDED.db_user,
          db_password = EXCLUDED.db_password,
          connection_string = EXCLUDED.connection_string,
          can_connect_externally = EXCLUDED.can_connect_externally,
          updated_at = NOW()`,
      [appId, databaseName, dbUser, dbPassword, connectionString, true],
    );

    if (!providedClient) {
      await client.query("COMMIT");
    }

    console.log(`[DB] ✅ Dedicated database provisioned successfully`);

    return {
      databaseName,
      dbUser,
      dbPassword,
      connectionString,
      host,
      port,
      canConnectExternally: true,
      appId,
    };
  } catch (err) {
    if (!providedClient) {
      await client.query("ROLLBACK");
    }
    console.error(`[DB] ❌ Failed to provision dedicated database:`, err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
}

async function runBaseMigrations(
  client: PoolClient,
  schemaName: string,
): Promise<void> {
  await client.query(`SET search_path TO ${schemaName}, public`);

  const migrationPath = path.join(
    __dirname,
    "..",
    "migrations",
    "tenant",
    "001_base_schema.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");
  await client.query(sql);

  await client.query(
    `INSERT INTO schema_migrations (version) VALUES ('001_base')
     ON CONFLICT (version) DO NOTHING`,
  );
}

/**
 * Run base migrations on a dedicated database (not a schema)
 */
async function runBaseMigrationsOnDatabase(
  client: PoolClient,
): Promise<void> {
  const migrationPath = path.join(
    __dirname,
    "..",
    "migrations",
    "tenant",
    "001_base_schema.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");
  await client.query(sql);

  await client.query(
    `INSERT INTO schema_migrations (version) VALUES ('001_base')
     ON CONFLICT (version) DO NOTHING`,
  );
}

function buildConnectionString(schemaName: string): string {
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const db = process.env.POSTGRES_DB || "applaa";
  const dbUser = process.env.POSTGRES_USER || "applaa_user";
  const dbPassword = process.env.POSTGRES_PASSWORD || "applaa_dev_password";

  return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(
    dbPassword,
  )}@${host}:${port}/${db}?schema=${schemaName}`;
}

/**
 * Creates app-specific tables based on requirements
 * Called when AI generates code that needs specific tables
 */
export async function createAppSpecificSchema(
  appId: number,
  schemaDefinition: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string; constraints?: string }>;
    }>;
  },
): Promise<void> {
  const client = await pool.connect();

  try {
    // Get schema name for this app
    const result = await client.query(
      `SELECT schema_name FROM core.app_databases WHERE app_id = $1`,
      [appId],
    );

    if (result.rows.length === 0) {
      throw new Error(`No database found for app ${appId}`);
    }

    const schemaName = result.rows[0].schema_name;
    await client.query(`SET search_path TO ${schemaName}, public`);

    // Create each table
    for (const table of schemaDefinition.tables) {
      const columns = table.columns
        .map((col) => `${col.name} ${col.type} ${col.constraints || ""}`)
        .join(", ");

      await client.query(
        `CREATE TABLE IF NOT EXISTS ${schemaName}.${table.name} (${columns})`,
      );

      console.log(`✅ Created table ${table.name} in schema ${schemaName}`);
    }
  } finally {
    client.release();
  }
}

/**
 * Create tables from a schema template
 */
export async function createTablesFromTemplate(
  appId: number,
  template: AppSchemaTemplate,
): Promise<void> {
  const client = await pool.connect();

  try {
    // Get schema name for this app
    const result = await client.query(
      `SELECT schema_name FROM core.app_databases WHERE app_id = $1`,
      [appId],
    );

    if (result.rows.length === 0) {
      throw new Error(`No database found for app ${appId}`);
    }

    const schemaName = result.rows[0].schema_name;

    console.log(`[DB] Creating tables from template '${template.name}' for app ${appId} in schema '${schemaName}'`);

    // Set search path to the app's schema
    await client.query(`SET search_path TO ${schemaName}, public`);

    // Execute each table's SQL
    for (const table of template.tables) {
      console.log(`[DB] Creating table: ${table.name}`);
      await client.query(table.sql);
    }

    console.log(`[DB] Successfully created ${template.tables.length} table(s) for app ${appId}`);
  } finally {
    client.release();
  }
}

/**
 * Auto-detect app type and create appropriate tables
 */
export async function autoCreateTables(
  appId: number,
  appName: string,
): Promise<{ created: boolean; template?: string; tables?: string[] }> {
  const template = detectAppType(appName);

  if (!template) {
    console.log(`[DB] No template detected for app: ${appName}`);
    return { created: false };
  }

  console.log(`[DB] Detected app type '${template.name}' for: ${appName}`);

  await createTablesFromTemplate(appId, template);

  return {
    created: true,
    template: template.name,
    tables: template.tables.map((t) => t.name),
  };
}

/**
 * Get database info for an app
 */
export async function getAppDatabaseInfo(appId: number): Promise<{
  schemaName?: string;
  databaseName?: string;
  dbUser?: string;
  dbPassword?: string;
  connectionString: string;
  canConnectExternally?: boolean;
  host?: string;
  port?: number;
} | null> {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT 
        schema_name, 
        database_name, 
        db_user, 
        db_password, 
        connection_string,
        can_connect_externally
       FROM core.app_databases 
       WHERE app_id = $1`,
      [appId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const host = process.env.POSTGRES_HOST || "localhost";
    const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);

    return {
      schemaName: row.schema_name || undefined,
      databaseName: row.database_name || undefined,
      dbUser: row.db_user || undefined,
      dbPassword: row.db_password || undefined,
      connectionString: row.connection_string,
      canConnectExternally: row.can_connect_externally || false,
      host,
      port,
    };
  } finally {
    client.release();
  }
}


