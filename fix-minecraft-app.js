// Quick script to fix appType for Minecraft app
const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'applaa.db');
const db = new Database(dbPath);

// Update app 121 to have correct appType
const result = db.prepare(`
  UPDATE apps 
  SET appType = 'minecraft', framework = 'minecraft-makecode'
  WHERE id = 121
`).run();

console.log('Updated app 121:', result);

// Verify the update
const app121 = db.prepare('SELECT id, name, appType, framework FROM apps WHERE id = 121').get();
console.log('App 121 after update:', app121);

db.close();
