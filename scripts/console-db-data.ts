#!/usr/bin/env ts-node

/**
 * Script to console/log all data from the Applaa SQLite database
 * Usage: npm run console-db-data
 * or: npx ts-node scripts/console-db-data.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Get user data path (same logic as in the app)
function getUserDataPath(): string {
  // Try to use electron if available
  try {
    const { app } = require('electron');
    if (app && app.getPath) {
      return app.getPath('userData');
    }
  } catch {
    // Not in Electron environment, use fallback
  }
  
  // Fallback for when running as script
  const os = require('os');
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Applaa');
  } else if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Applaa');
  } else {
    return path.join(os.homedir(), '.config', 'Applaa');
  }
}

function getDatabasePath(): string {
  return path.join(getUserDataPath(), 'sqlite.db');
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return `"${value.substring(0, 100)}..." (${value.length} chars)`;
    }
    return `"${value}"`;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (Buffer.isBuffer(value)) {
    return `<Buffer ${value.length} bytes>`;
  }
  return JSON.stringify(value);
}

function formatTableData(tableName: string, rows: any[]): void {
  if (rows.length === 0) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log('   (empty)');
    return;
  }

  console.log(`\n📋 Table: ${tableName}`);
  console.log(`   Rows: ${rows.length}`);
  console.log('   ─'.repeat(80));

  // Get column names from first row
  const columns = Object.keys(rows[0]);
  
  // Print header
  const header = columns.map(col => col.padEnd(20)).join(' | ');
  console.log(`   ${header}`);
  console.log('   ' + '─'.repeat(header.length));

  // Print rows (limit to first 50 for readability)
  const displayRows = rows.slice(0, 50);
  displayRows.forEach((row, index) => {
    const values = columns.map(col => {
      const val = formatValue(row[col]);
      return val.length > 20 ? val.substring(0, 17) + '...' : val.padEnd(20);
    });
    console.log(`   ${values.join(' | ')}`);
  });

  if (rows.length > 50) {
    console.log(`   ... and ${rows.length - 50} more rows`);
  }
}

function consoleDatabaseData() {
  const dbPath = getDatabasePath();
  
  console.log('🔍 Applaa Database Data Viewer');
  console.log('═'.repeat(80));
  console.log(`📁 Database Path: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found at: ${dbPath}`);
    console.log('\n💡 The database will be created when you first use the app.');
    process.exit(1);
  }

  const stats = fs.statSync(dbPath);
  console.log(`📊 Database Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('═'.repeat(80));

  let db: Database.Database | null = null;

  try {
    db = new Database(dbPath, { readonly: true });
    
    // Get all table names
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;

    if (tables.length === 0) {
      console.log('\n📭 No tables found in database');
      return;
    }

    console.log(`\n📊 Found ${tables.length} table(s):`);
    tables.forEach(table => console.log(`   - ${table.name}`));

    // Get data from each table
    for (const table of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
        formatTableData(table.name, rows);
      } catch (error: any) {
        console.error(`\n❌ Error reading table ${table.name}:`, error.message);
      }
    }

    // Summary statistics
    console.log('\n\n📈 Database Summary');
    console.log('═'.repeat(80));
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
        console.log(`   ${table.name.padEnd(30)} ${count.count.toString().padStart(6)} rows`);
      } catch (error) {
        // Ignore errors
      }
    }

  } catch (error: any) {
    console.error('❌ Error reading database:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }

  console.log('\n✅ Done!\n');
}

// Run the script
if (require.main === module) {
  consoleDatabaseData();
}

export { consoleDatabaseData };

