// Quick script to clear browser tabs from database
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'applaa.db');
const db = new Database(dbPath);

try {
    const result = db.prepare('DELETE FROM browser_tabs').run();
    console.log(`✅ Cleared ${result.changes} browser tabs from database`);
} catch (error) {
    console.error('❌ Error clearing tabs:', error);
} finally {
    db.close();
}
