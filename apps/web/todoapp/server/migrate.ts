import { pool } from './db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running migrations...');
    
    const migrationFile = path.join(__dirname, 'migrations', '001_create_todos.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    await pool.query(sql);
    console.log('✅ Migrations completed successfully');
    
    // Test if table exists
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'todos'"
    );
    
    if (result.rows.length > 0) {
      console.log('✅ todos table exists');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

