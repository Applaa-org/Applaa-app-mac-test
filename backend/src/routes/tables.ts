import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "../db/pool";

export const tablesRouter = Router();

/**
 * Parse Supabase-style query parameters into SQL WHERE clauses
 * Supports: eq, neq, gt, gte, lt, lte, like, ilike, in, is, isnot
 * Example: conversation_id=eq.1&status=neq.completed
 */
function parseQueryFilters(query: any): { whereClause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(query)) {
    // Skip special parameters
    if (key === 'appId' || key === 'order' || typeof value !== 'string') {
      continue;
    }

    // Parse Supabase-style operators: column=operator.value
    const parts = value.split('.');
    if (parts.length < 2) {
      // Simple equality: column=value
      conditions.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
      continue;
    }

    const operator = parts[0];
    const operatorValue = parts.slice(1).join('.'); // Handle values with dots

    // Sanitize column name
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      continue; // Skip invalid column names
    }

    switch (operator) {
      case 'eq':
        conditions.push(`${key} = $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'neq':
        conditions.push(`${key} != $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'gt':
        conditions.push(`${key} > $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'gte':
        conditions.push(`${key} >= $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'lt':
        conditions.push(`${key} < $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'lte':
        conditions.push(`${key} <= $${paramIndex}`);
        params.push(operatorValue);
        paramIndex++;
        break;
      case 'like':
        conditions.push(`${key} LIKE $${paramIndex}`);
        params.push(`%${operatorValue}%`);
        paramIndex++;
        break;
      case 'ilike':
        conditions.push(`${key} ILIKE $${paramIndex}`);
        params.push(`%${operatorValue}%`);
        paramIndex++;
        break;
      case 'in':
        // Handle comma-separated values: in.value1,value2,value3
        const inValues = operatorValue.split(',');
        const placeholders = inValues.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...inValues);
        break;
      case 'is':
        if (operatorValue.toLowerCase() === 'null') {
          conditions.push(`${key} IS NULL`);
        } else {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(operatorValue);
          paramIndex++;
        }
        break;
      case 'isnot':
        if (operatorValue.toLowerCase() === 'null') {
          conditions.push(`${key} IS NOT NULL`);
        } else {
          conditions.push(`${key} != $${paramIndex}`);
          params.push(operatorValue);
          paramIndex++;
        }
        break;
      default:
        // Unknown operator, treat as simple equality
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Parse order parameter: order=column.asc or order=column.desc
 */
function parseOrder(query: any): string {
  const orderParam = query.order;
  if (!orderParam || typeof orderParam !== 'string') {
    return 'ORDER BY created_at DESC'; // Default ordering
  }

  const parts = orderParam.split('.');
  if (parts.length !== 2) {
    return 'ORDER BY created_at DESC';
  }

  const column = parts[0];
  const direction = parts[1].toLowerCase();

  // Sanitize column name
  if (!/^[a-z][a-z0-9_]*$/.test(column)) {
    return 'ORDER BY created_at DESC';
  }

  if (direction === 'asc' || direction === 'desc') {
    return `ORDER BY ${column} ${direction.toUpperCase()}`;
  }

  return 'ORDER BY created_at DESC';
}

/**
 * Check if table exists in schema
 */
async function tableExists(schemaName: string, tableName: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      )`,
      [schemaName, tableName]
    );
    return result.rows[0].exists;
  } catch (err) {
    console.error(`[tables] Error checking table existence:`, err);
    return false;
  }
}

/**
 * Generic helper to get app's schema from appId
 */
async function getAppSchema(appId: number): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT schema_name FROM core.app_databases WHERE app_id = $1",
      [appId],
    );
    return result.rows.length > 0 ? result.rows[0].schema_name : null;
  } catch (err) {
    console.error("[tables] Error getting app schema:", err);
    return null;
  }
}

/**
 * Generic helper to get the most recent app's schema (for backward compatibility)
 */
async function getDefaultSchema(): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT schema_name FROM core.app_databases ORDER BY created_at DESC LIMIT 1",
    );
    return result.rows.length > 0 ? result.rows[0].schema_name : null;
  } catch (err) {
    console.error("[tables] Error getting default schema:", err);
    return null;
  }
}

/**
 * Generic GET /api/:tableName - Get all rows from any table
 * Supports Supabase-style query parameters:
 *   - Filtering: column=eq.value, column=neq.value, column=gt.value, etc.
 *   - Ordering: order=column.asc or order=column.desc
 *   - Multiple filters: conversation_id=eq.1&status=neq.completed
 * 
 * Example: /api/messages?conversation_id=eq.1&order=created_at.asc
 */
tablesRouter.get("/:tableName", async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const appId = req.query.appId ? parseInt(req.query.appId as string, 10) : null;

    let schemaName: string | null;
    if (appId) {
      schemaName = await getAppSchema(appId);
    } else {
      schemaName = await getDefaultSchema();
    }

    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Sanitize table name to prevent SQL injection
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
      res.status(400).json({ error: "Invalid table name" });
      return;
    }

    // Check if table exists, if not return empty array (don't auto-create on GET)
    const exists = await tableExists(schemaName, tableName);
    if (!exists) {
      console.warn(`[tables] Table ${schemaName}.${tableName} does not exist`);
      res.json([]);
      return;
    }

    // Parse query filters and ordering
    const { whereClause, params } = parseQueryFilters(req.query);
    const orderClause = parseOrder(req.query);

    // Build query
    const query = `SELECT * FROM ${schemaName}.${tableName} ${whereClause} ${orderClause}`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error(`[tables] Error fetching ${req.params.tableName}:`, err);
    res.status(500).json({
      error: `Failed to fetch ${req.params.tableName}`,
      message: err.message,
    });
  }
});

/**
 * Auto-create table if it doesn't exist (simple structure)
 * Creates a basic table with id, created_at, updated_at and columns from first insert
 */
async function ensureTableExists(schemaName: string, tableName: string, sampleData: any): Promise<void> {
  const exists = await tableExists(schemaName, tableName);
  if (exists) {
    return;
  }

  console.log(`[tables] Auto-creating table ${schemaName}.${tableName}`);

  // Build column definitions from sample data
  const columns: string[] = ['id SERIAL PRIMARY KEY'];
  
  for (const [key, value] of Object.entries(sampleData)) {
    // Sanitize column name
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      continue;
    }

    // Infer type from value
    let columnType = 'TEXT';
    if (typeof value === 'number') {
      columnType = Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
    } else if (typeof value === 'boolean') {
      columnType = 'BOOLEAN';
    } else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
      columnType = 'TIMESTAMP';
    }

    columns.push(`${key} ${columnType}`);
  }

  // Add standard timestamp columns
  if (!sampleData.created_at) {
    columns.push('created_at TIMESTAMP DEFAULT NOW()');
  }
  if (!sampleData.updated_at) {
    columns.push('updated_at TIMESTAMP DEFAULT NOW()');
  }

  const createTableSQL = `CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (${columns.join(', ')})`;
  
  await pool.query(createTableSQL);
  console.log(`[tables] ✅ Auto-created table ${schemaName}.${tableName}`);
}

/**
 * Generic POST /api/:tableName - Create a new row in any table
 * Auto-creates table if it doesn't exist
 */
tablesRouter.post("/:tableName", async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const appId = req.query.appId ? parseInt(req.query.appId as string, 10) : null;
    const data = req.body;

    let schemaName: string | null;
    if (appId) {
      schemaName = await getAppSchema(appId);
    } else {
      schemaName = await getDefaultSchema();
    }

    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Sanitize table name
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
      res.status(400).json({ error: "Invalid table name" });
      return;
    }

    // Auto-create table if it doesn't exist
    await ensureTableExists(schemaName, tableName, data);

    // Build dynamic INSERT query
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    const query = `INSERT INTO ${schemaName}.${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(`[tables] Error creating ${req.params.tableName}:`, err);
    res.status(500).json({
      error: `Failed to create ${req.params.tableName}`,
      message: err.message,
    });
  }
});

/**
 * Generic PUT /api/:tableName/:id - Update a row in any table
 */
tablesRouter.put("/:tableName/:id", async (req: Request, res: Response) => {
  try {
    const { tableName, id } = req.params;
    const appId = req.query.appId ? parseInt(req.query.appId as string, 10) : null;
    const updates = req.body;

    let schemaName: string | null;
    if (appId) {
      schemaName = await getAppSchema(appId);
    } else {
      schemaName = await getDefaultSchema();
    }

    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Sanitize table name
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
      res.status(400).json({ error: "Invalid table name" });
      return;
    }

    // Build dynamic UPDATE query
    const columns = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");

    const query = `UPDATE ${schemaName}.${tableName} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;

    const result = await pool.query(query, [...values, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: `${tableName} not found` });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(`[tables] Error updating ${req.params.tableName}:`, err);
    res.status(500).json({
      error: `Failed to update ${req.params.tableName}`,
      message: err.message,
    });
  }
});

/**
 * Generic DELETE /api/:tableName/:id - Delete a row from any table
 */
tablesRouter.delete("/:tableName/:id", async (req: Request, res: Response) => {
  try {
    const { tableName, id } = req.params;
    const appId = req.query.appId ? parseInt(req.query.appId as string, 10) : null;

    let schemaName: string | null;
    if (appId) {
      schemaName = await getAppSchema(appId);
    } else {
      schemaName = await getDefaultSchema();
    }

    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Sanitize table name
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
      res.status(400).json({ error: "Invalid table name" });
      return;
    }

    const query = `DELETE FROM ${schemaName}.${tableName} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: `${tableName} not found` });
      return;
    }

    res.status(204).send();
  } catch (err: any) {
    console.error(`[tables] Error deleting ${req.params.tableName}:`, err);
    res.status(500).json({
      error: `Failed to delete ${req.params.tableName}`,
      message: err.message,
    });
  }
});

