#!/usr/bin/env node

/**
 * Clean All Apps Script
 * Removes all apps from database and deletes their folders for fresh testing
 */

const fs = require('fs-extra');
const path = require('path');
const Database = require('better-sqlite3');

async function cleanAllApps() {
  console.log('🧹 Starting fresh app cleanup...');
  
  try {
    // 1. Connect to database
    const dbPath = path.join(__dirname, '..', 'userData', 'sqlite.db');
    console.log(`📂 Connecting to database: ${dbPath}`);
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database not found, nothing to clean');
      return;
    }
    
    const db = new Database(dbPath);
    
    // 2. Get all apps
    const apps = db.prepare('SELECT * FROM apps').all();
    console.log(`📱 Found ${apps.length} apps to clean`);
    
    if (apps.length === 0) {
      console.log('✅ No apps found, database is already clean');
      db.close();
      return;
    }
    
    // 3. Delete app folders
    const appsBasePath = 'C:\\Users\\rahul\\applaa-apps';
    console.log(`🗂️ Cleaning app folders in: ${appsBasePath}`);
    
    if (fs.existsSync(appsBasePath)) {
      const folders = fs.readdirSync(appsBasePath);
      console.log(`📁 Found ${folders.length} app folders to delete`);
      
      for (const folder of folders) {
        const folderPath = path.join(appsBasePath, folder);
        try {
          console.log(`🗑️ Deleting: ${folder}`);
          await fs.remove(folderPath);
        } catch (error) {
          console.warn(`⚠️ Could not delete ${folder}: ${error.message}`);
        }
      }
    }
    
    // 4. Clean database tables
    console.log('🗄️ Cleaning database tables...');
    
    // Delete in correct order (foreign key constraints)
    const deleteMessages = db.prepare('DELETE FROM messages');
    const deleteChats = db.prepare('DELETE FROM chats');
    const deleteApps = db.prepare('DELETE FROM apps');
    
    const messagesDeleted = deleteMessages.run();
    console.log(`💬 Deleted ${messagesDeleted.changes} messages`);
    
    const chatsDeleted = deleteChats.run();
    console.log(`💭 Deleted ${chatsDeleted.changes} chats`);
    
    const appsDeleted = deleteApps.run();
    console.log(`📱 Deleted ${appsDeleted.changes} apps`);
    
    // 5. Reset auto-increment counters
    db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("apps", "chats", "messages")').run();
    console.log('🔄 Reset ID counters');
    
    db.close();
    
    console.log('✅ Fresh cleanup completed successfully!');
    console.log('🚀 Ready for clean testing');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanAllApps().catch(console.error);
