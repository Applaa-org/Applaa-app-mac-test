import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

// AsyncStorage utilities for simple key-value storage
export class SimpleStorage {
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}

// SQLite utilities for complex data storage
export class DatabaseStorage {
  private static db: SQLite.SQLiteDatabase | null = null;

  static async initialize(databaseName: string = 'app.db'): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(databaseName);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  static async createTable(tableName: string, schema: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${tableName} (${schema});
      `);
      console.log(`Table ${tableName} created successfully`);
    } catch (error) {
      console.error(`Error creating table ${tableName}:`, error);
      throw error;
    }
  }

  static async insert(tableName: string, data: Record<string, any>): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    try {
      const result = await this.db.runAsync(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`Error inserting into ${tableName}:`, error);
      throw error;
    }
  }

  static async select(tableName: string, where?: string, params?: any[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = `SELECT * FROM ${tableName}`;
    if (where) {
      query += ` WHERE ${where}`;
    }

    try {
      const result = await this.db.getAllAsync(query, params);
      return result;
    } catch (error) {
      console.error(`Error selecting from ${tableName}:`, error);
      throw error;
    }
  }

  static async update(tableName: string, data: Record<string, any>, where: string, params: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...params];

    try {
      await this.db.runAsync(
        `UPDATE ${tableName} SET ${setClause} WHERE ${where}`,
        values
      );
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      throw error;
    }
  }

  static async delete(tableName: string, where: string, params: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.runAsync(`DELETE FROM ${tableName} WHERE ${where}`, params);
    } catch (error) {
      console.error(`Error deleting from ${tableName}:`, error);
      throw error;
    }
  }
}
