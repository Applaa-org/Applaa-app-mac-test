/**
 * Schema Parser - Detects and executes AI-generated database schemas
 * 
 * Looks for <applaa-create-tables> tags in AI responses and automatically
 * creates the tables in the database.
 */

import log from "electron-log";
import { backendAPI } from "./backend-api";

const logger = log.scope("schema-parser");

export interface SchemaParseResult {
  found: boolean;
  sql?: string;
  executed?: boolean;
  error?: string;
  tables?: string[];
}

/**
 * Parse AI response for schema creation tags
 */
export function parseSchemaFromResponse(response: string): SchemaParseResult {
  const tagRegex = /<applaa-create-tables>([\s\S]*?)<\/applaa-create-tables>/gi;
  const matches = response.match(tagRegex);

  if (!matches || matches.length === 0) {
    return { found: false };
  }

  // Extract SQL from the first match
  const match = matches[0];
  const sql = match
    .replace(/<applaa-create-tables>/gi, "")
    .replace(/<\/applaa-create-tables>/gi, "")
    .trim();

  if (!sql) {
    return { found: false };
  }

  // Extract table names from CREATE TABLE statements
  const tableNames: string[] = [];
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  let tableMatch;
  while ((tableMatch = createTableRegex.exec(sql)) !== null) {
    tableNames.push(tableMatch[1]);
  }

  return {
    found: true,
    sql,
    tables: tableNames,
  };
}

/**
 * Execute schema creation on the backend
 */
export async function executeSchema(
  appId: number,
  sql: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log(`[schema-parser] Executing schema for app ${appId}`);
    logger.log(`[schema-parser] SQL length: ${sql.length} characters`);

    const response = await fetch(
      `${process.env.BACKEND_API_URL || "http://localhost:3000/api"}/apps/${appId}/schema/sql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[schema-parser] Failed to execute schema:`, errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.log(`[schema-parser] Schema executed successfully:`, result);

    return { success: true };
  } catch (error: any) {
    logger.error(`[schema-parser] Error executing schema:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Parse and execute schema from AI response
 */
export async function parseAndExecuteSchema(
  response: string,
  appId: number,
): Promise<SchemaParseResult> {
  const parseResult = parseSchemaFromResponse(response);

  if (!parseResult.found || !parseResult.sql) {
    return parseResult;
  }

  logger.log(
    `[schema-parser] Found schema definition for app ${appId}`,
  );
  logger.log(`[schema-parser] Tables to create: ${parseResult.tables?.join(", ")}`);

  const executeResult = await executeSchema(appId, parseResult.sql);

  return {
    ...parseResult,
    executed: executeResult.success,
    error: executeResult.error,
  };
}

/**
 * Remove schema tags from AI response for display
 * (So users don't see the raw XML tags)
 */
export function removeSchemaTagsFromResponse(response: string): string {
  return response.replace(/<applaa-create-tables>[\s\S]*?<\/applaa-create-tables>/gi, "").trim();
}

/**
 * Process AI response for schema tags and execute them automatically
 * This should be called after the AI completes its response
 */
export async function processAIResponseForSchema(
  fullResponse: string,
  appId: number,
): Promise<{ success: boolean; tablesCreated: string[]; error?: string }> {
  try {
    const parseResult = parseSchemaFromResponse(fullResponse);

    if (!parseResult.found || !parseResult.sql) {
      logger.log(`[schema-parser] No schema tags found in AI response for app ${appId}`);
      return { success: true, tablesCreated: [] };
    }

    logger.log(`[schema-parser] Found schema tags for app ${appId}`);
    logger.log(`[schema-parser] Tables: ${parseResult.tables?.join(", ")}`);

    const executeResult = await executeSchema(appId, parseResult.sql);

    if (executeResult.success) {
      logger.log(`[schema-parser] ✅ Successfully created tables: ${parseResult.tables?.join(", ")}`);
      return { 
        success: true, 
        tablesCreated: parseResult.tables || [] 
      };
    } else {
      logger.error(`[schema-parser] ❌ Failed to create tables:`, executeResult.error);
      return { 
        success: false, 
        tablesCreated: [], 
        error: executeResult.error 
      };
    }
  } catch (error: any) {
    logger.error(`[schema-parser] Error processing schema:`, error);
    return { 
      success: false, 
      tablesCreated: [], 
      error: error.message 
    };
  }
}
