import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "../db/pool";
import {
  provisionAppDatabase,
  provisionDedicatedDatabase,
  createAppSpecificSchema,
  autoCreateTables,
  createTablesFromTemplate,
  getAppDatabaseInfo,
} from "../services/database-provisioning";
import { getSchemaTemplate } from "../schemas/app-templates";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export const appsRouter = Router();

interface CreateAppBody {
  name: string;
  appType?: "web" | "mobile" | "godot";
  dedicatedDatabase?: boolean; // NEW: Request dedicated database
  userId?: number; // NEW: User ID for dedicated database naming
}

// Simple unauthenticated endpoint for local development.
// In production, this should be protected with proper auth.
appsRouter.post(
  "/apps",
  async (req: Request<unknown, unknown, CreateAppBody>, res: Response) => {
    const { name, appType, dedicatedDatabase, userId } = req.body;
    // Default to dedicated databases for all new apps unless explicitly disabled
    const useDedicated = dedicatedDatabase !== false;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const client = await pool.connect();

    try {
      // For dedicated DB provisioning, avoid wrapping CREATE DATABASE in a transaction
      const wrapInTx = !useDedicated;

      if (wrapInTx) {
        await client.query("BEGIN");
      }

      const appResult = await client.query(
        `INSERT INTO core.apps (name, app_type, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [name, appType ?? "web"],
      );

      const appId: number = appResult.rows[0].id;

      // Choose provisioning method based on request
      let databaseResponse: any;

      if (useDedicated) {
        // Provision dedicated database
        console.log(`[apps] Provisioning DEDICATED database for app ${appId}`);
        const dedicatedDb = await provisionDedicatedDatabase(
          appId,
          name,
          userId || 1, // Default to user 1 if not provided
          undefined, // use a fresh client without a transaction
        );

        databaseResponse = {
          mode: "dedicated",
          databaseName: dedicatedDb.databaseName,
          dbUser: dedicatedDb.dbUser,
          dbPassword: dedicatedDb.dbPassword,
          connectionString: dedicatedDb.connectionString,
          host: dedicatedDb.host,
          port: dedicatedDb.port,
          canConnectExternally: dedicatedDb.canConnectExternally,
        };
      } else {
        // Provision schema-based database (legacy/default)
        console.log(`[apps] Provisioning SCHEMA-based database for app ${appId}`);
        const dbInfo = await provisionAppDatabase(
          appId,
          name,
          appType ?? "web",
          client,
        );

        databaseResponse = {
          mode: "schema",
          schemaName: dbInfo.schemaName,
          connectionString: dbInfo.connectionString,
          canConnectExternally: false,
        };
      }

      if (wrapInTx) {
        await client.query("COMMIT");
      }

      // Auto-create tables based on app name/type
      let tablesInfo = null;
      try {
        console.log(`[apps] Auto-detecting app type for: "${name}"`);
        const autoSetupResult = await autoCreateTables(appId, name);
        if (autoSetupResult.created) {
          console.log(`[apps] Auto-created tables: ${autoSetupResult.tables?.join(", ")}`);
          tablesInfo = {
            template: autoSetupResult.template,
            tables: autoSetupResult.tables,
          };
        } else {
          console.log(`[apps] No template detected for app type`);
        }
      } catch (autoSetupErr: any) {
        console.warn(`[apps] Auto-setup failed (non-critical):`, autoSetupErr.message);
      }

      res.json({
        id: appId,
        name,
        appType: appType ?? "web",
        database: {
          ...databaseResponse,
          autoSetup: tablesInfo,
        },
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      // eslint-disable-next-line no-console
      console.error("[backend] Failed to create app:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    } finally {
      client.release();
    }
  },
);

// Get app database info
appsRouter.get(
  "/apps/:appId/database",
  async (req: Request<{ appId: string }>, res: Response) => {
    const appId = parseInt(req.params.appId, 10);

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT schema_name, connection_string 
         FROM core.app_databases 
         WHERE app_id = $1`,
        [appId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Database not found for this app" });
        return;
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      console.error("[backend] Failed to get app database:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  },
);

// Create app-specific schema tables
appsRouter.post(
  "/apps/:appId/schema",
  async (
    req: Request<
      { appId: string },
      unknown,
      {
        tables: Array<{
          name: string;
          columns: Array<{ name: string; type: string; constraints?: string }>;
        }>;
      }
    >,
    res: Response,
  ) => {
    const appId = parseInt(req.params.appId, 10);
    const { tables } = req.body;

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    if (!tables || !Array.isArray(tables)) {
      res.status(400).json({ error: "tables array is required" });
      return;
    }

    try {
      await createAppSpecificSchema(appId, { tables });
      res.json({ message: "Schema created successfully" });
    } catch (err: any) {
      console.error("[backend] Failed to create app schema:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  },
);

// POST /apps/:appId/schema/sql - Create schema from raw SQL (AI-generated)
appsRouter.post(
  "/apps/:appId/schema/sql",
  async (
    req: Request<{ appId: string }, unknown, { sql: string }>,
    res: Response,
  ) => {
    const appId = parseInt(req.params.appId, 10);
    const { sql } = req.body;

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    if (!sql || typeof sql !== "string") {
      res.status(400).json({ error: "sql string is required" });
      return;
    }

    const client = await pool.connect();

    try {
      // Get schema name for this app
      const result = await client.query(
        `SELECT schema_name FROM core.app_databases WHERE app_id = $1`,
        [appId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: `No database found for app ${appId}` });
        return;
      }

      const schemaName = result.rows[0].schema_name;

      console.log(`[backend] Executing AI-generated SQL for app ${appId} in schema ${schemaName}`);
      console.log(`[backend] SQL: ${sql.substring(0, 200)}...`);

      // Set search path to the app's schema
      await client.query(`SET search_path TO ${schemaName}, public`);

      // Execute the SQL
      await client.query(sql);

      console.log(`[backend] ✅ SQL executed successfully`);

      res.json({ 
        message: "Schema created successfully from SQL",
        schemaName,
      });
    } catch (err: any) {
      console.error("[backend] Failed to execute SQL:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    } finally {
      client.release();
    }
  },
);

// POST /apps/:appId/auto-setup - Automatically detect and create tables
appsRouter.post(
  "/apps/:appId/auto-setup",
  async (req: Request<{ appId: string }, unknown, { appName?: string }>, res: Response) => {
    const appId = parseInt(req.params.appId, 10);
    const { appName } = req.body;

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    try {
      // If appName not provided, get it from the database
      let name = appName;
      if (!name) {
        const result = await pool.query(
          "SELECT name FROM core.apps WHERE id = $1",
          [appId],
        );
        if (result.rows.length === 0) {
          res.status(404).json({ error: "App not found" });
          return;
        }
        name = result.rows[0].name;
      }

      if (!name) {
        res.status(400).json({ error: "App name is required" });
        return;
      }

      const setupResult = await autoCreateTables(appId, name);

      if (setupResult.created) {
        res.json({
          message: "Tables created successfully",
          template: setupResult.template,
          tables: setupResult.tables,
        });
      } else {
        res.json({
          message: "No template detected for this app type",
          created: false,
        });
      }
    } catch (err: any) {
      console.error("[backend] Failed to auto-create tables:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  },
);

// POST /apps/:appId/setup/:templateName - Create tables from a specific template
appsRouter.post(
  "/apps/:appId/setup/:templateName",
  async (req: Request<{ appId: string; templateName: string }>, res: Response) => {
    const appId = parseInt(req.params.appId, 10);
    const { templateName } = req.params;

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    const template = getSchemaTemplate(templateName);
    if (!template) {
      res.status(404).json({ error: `Template '${templateName}' not found` });
      return;
    }

    try {
      await createTablesFromTemplate(appId, template);
      res.json({
        message: "Tables created successfully",
        template: template.name,
        tables: template.tables.map((t) => t.name),
      });
    } catch (err: any) {
      console.error("[backend] Failed to create tables from template:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  },
);

// GET /apps/:appId/credentials - Get database credentials for external access
appsRouter.get(
  "/apps/:appId/credentials",
  async (req: Request<{ appId: string }>, res: Response) => {
    const appId = parseInt(req.params.appId, 10);

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    try {
      const dbInfo = await getAppDatabaseInfo(appId);

      if (!dbInfo) {
        res.status(404).json({ error: "Database not found for this app" });
        return;
      }

      res.json({
        host: dbInfo.host,
        port: dbInfo.port,
        databaseName: dbInfo.databaseName,
        username: dbInfo.dbUser,
        password: dbInfo.dbPassword,
        connectionString: dbInfo.connectionString,
        canConnectExternally: dbInfo.canConnectExternally || false,
        recommendedClients: [
          "pgAdmin (Free, cross-platform)",
          "DBeaver (Free, cross-platform)",
          "TablePlus (Mac, paid)",
          "Postico (Mac, paid)",
        ],
      });
    } catch (err: any) {
      console.error("[backend] Failed to get database credentials:", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  },
);

// GET /apps/:appId/export - Export database as SQL dump
appsRouter.get(
  "/apps/:appId/export",
  async (req: Request<{ appId: string }>, res: Response) => {
    const appId = parseInt(req.params.appId, 10);

    if (isNaN(appId)) {
      res.status(400).json({ error: "Invalid app ID" });
      return;
    }

    try {
      const dbInfo = await getAppDatabaseInfo(appId);

      if (!dbInfo) {
        res.status(404).json({ error: "Database not found for this app" });
        return;
      }

      // Generate temporary file path
      const tmpDir = "/tmp";
      const timestamp = Date.now();
      const filename = `applaa_app_${appId}_export_${timestamp}.sql`;
      const filepath = path.join(tmpDir, filename);

      console.log(`[backend] Exporting database for app ${appId} to ${filepath}`);

      // Determine if we're exporting a schema or a database
      if (dbInfo.databaseName) {
        // Export dedicated database
        const pgDumpCmd = `PGPASSWORD="${dbInfo.dbPassword}" pg_dump -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.dbUser} -d ${dbInfo.databaseName} -f ${filepath}`;
        await execAsync(pgDumpCmd);
      } else if (dbInfo.schemaName) {
        // Export specific schema
        const pgDumpCmd = `PGPASSWORD="${process.env.POSTGRES_PASSWORD}" pg_dump -h ${process.env.POSTGRES_HOST || "localhost"} -p ${process.env.POSTGRES_PORT || "5432"} -U ${process.env.POSTGRES_USER || "applaa_user"} -d ${process.env.POSTGRES_DB || "applaa"} -n ${dbInfo.schemaName} -f ${filepath}`;
        await execAsync(pgDumpCmd);
      } else {
        throw new Error("No database or schema found");
      }

      console.log(`[backend] Export successful: ${filepath}`);

      // Send the file
      res.download(filepath, `app_${appId}_backup_${timestamp}.sql`, (err) => {
        // Clean up temp file after download
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }

        if (err) {
          console.error("[backend] Error sending export file:", err);
        }
      });
    } catch (err: any) {
      console.error("[backend] Failed to export database:", err);
      res.status(500).json({ 
        error: "Failed to export database",
        details: err?.message ?? "Internal error",
      });
    }
  },
);


