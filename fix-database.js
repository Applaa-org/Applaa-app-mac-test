// Script to fix the database schema without losing data
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Get the database path (same as the app uses)
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'applaa-mvp-gcli', 'sqlite.db');

console.log('🔍 Checking database at:', dbPath);

const db = new Database(dbPath);

try {
  // Check current schema
  console.log('📋 Checking current database schema...');
  
  // Check if prompts table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📊 Tables in database:', tables.map(t => t.name));
  
  // Check prompts table structure
  const promptsTableExists = tables.some(t => t.name === 'prompts');
  if (promptsTableExists) {
    const promptsColumns = db.prepare("PRAGMA table_info(prompts)").all();
    console.log('📝 Prompts table columns:', promptsColumns.map(c => c.name));
    
    const hasCategoryColumn = promptsColumns.some(c => c.name === 'category');
    
    if (!hasCategoryColumn) {
      console.log('⚠️  Missing category column in prompts table. Adding it...');
      
      // Add the missing column
      db.prepare("ALTER TABLE prompts ADD COLUMN category text DEFAULT 'General'").run();
      console.log('✅ Added category column to prompts table');
      
      // Verify it was added
      const updatedColumns = db.prepare("PRAGMA table_info(prompts)").all();
      console.log('✅ Updated prompts table columns:', updatedColumns.map(c => c.name));
    } else {
      console.log('✅ Category column already exists in prompts table');
    }
  } else {
    console.log('⚠️  Prompts table does not exist');
  }
  
  // Check apps table and count
  const appsTableExists = tables.some(t => t.name === 'apps');
  if (appsTableExists) {
    const appsCount = db.prepare("SELECT COUNT(*) as count FROM apps").get();
    console.log('📱 Apps in database:', appsCount.count);
    
    if (appsCount.count === 0) {
      console.log('📂 No apps found in database. This explains why the UI is empty.');
      console.log('🔄 We need to restore apps from the filesystem...');
    } else {
      const apps = db.prepare("SELECT id, name, path FROM apps LIMIT 5").all();
      console.log('📱 Sample apps:', apps);
    }
  }
  
  // Check settings/API keys tables
  const settingsTables = tables.filter(t => t.name.includes('language_model') || t.name.includes('provider'));
  console.log('🔑 Settings-related tables:', settingsTables.map(t => t.name));
  
  console.log('✅ Database schema check complete!');
  
} catch (error) {
  console.error('❌ Database error:', error.message);
} finally {
  db.close();
}




