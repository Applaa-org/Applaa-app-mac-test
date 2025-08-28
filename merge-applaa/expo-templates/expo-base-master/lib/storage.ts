import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

// Unified storage interface
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// In-memory storage for web
class InMemoryStorage implements StorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

// SQLite storage for native platforms
class SQLiteStorage implements StorageAdapter {
  private db: SQLite.SQLiteDatabase | null = null;

  private async getDb() {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('storage.db');
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS storage (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
    }
    return this.db;
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM storage WHERE key = ?', [key]);
    return result?.value || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)', [key, value]);
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM storage WHERE key = ?', [key]);
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM storage');
  }
}

// Export the appropriate storage based on platform
export const storage: StorageAdapter = Platform.OS === 'web' 
  ? new InMemoryStorage() 
  : new SQLiteStorage();

// Utility functions for common operations
export const storageUtils = {
  async getObject<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async setObject(key: string, value: any): Promise<void> {
    await storage.setItem(key, JSON.stringify(value));
  },
};

