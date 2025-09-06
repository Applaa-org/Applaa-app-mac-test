/**
 * 🚨 APPLAA TEMPLATE FILE - Enhanced storage utilities
 * Provides AsyncStorage wrapper with additional features
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem {
  value: any;
  timestamp: number;
  expiration?: number;
}

interface StorageInfo {
  totalItems: number;
  totalSize: number;
  expiredItems: number;
}

class EnhancedStorage {
  private prefix = 'applaa_';

  async setItem(key: string, value: any, expirationMinutes?: number): Promise<void> {
    const item: StorageItem = {
      value,
      timestamp: Date.now(),
      expiration: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined
    };
    
    await AsyncStorage.setItem(this.prefix + key, JSON.stringify(item));
  }

  async getItem(key: string): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const item: StorageItem = JSON.parse(stored);
      
      // Check expiration
      if (item.expiration && Date.now() > item.expiration) {
        await this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
    await AsyncStorage.multiRemove(prefixedKeys);
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const keys = await AsyncStorage.getAllKeys();
    const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
    
    let totalSize = 0;
    let expiredItems = 0;
    
    for (const key of prefixedKeys) {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          totalSize += stored.length;
          
          const item: StorageItem = JSON.parse(stored);
          if (item.expiration && Date.now() > item.expiration) {
            expiredItems++;
          }
        }
      } catch (error) {
        console.error('Error checking storage item:', error);
      }
    }

    return {
      totalItems: prefixedKeys.length,
      totalSize,
      expiredItems
    };
  }

  async cleanupExpired(): Promise<number> {
    const keys = await AsyncStorage.getAllKeys();
    const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
    
    let cleanedCount = 0;
    
    for (const key of prefixedKeys) {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const item: StorageItem = JSON.parse(stored);
          if (item.expiration && Date.now() > item.expiration) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        console.error('Error cleaning storage item:', error);
      }
    }

    return cleanedCount;
  }
}

export const storage = new EnhancedStorage();

// User preferences helpers
export const storeUserPreference = async (key: string, value: any): Promise<void> => {
  await storage.setItem(`pref_${key}`, value);
};

export const getUserPreference = async (key: string): Promise<any> => {
  return await storage.getItem(`pref_${key}`);
};

// Backward compatible named exports used in tests
export const storeData = async (key: string, value: any): Promise<void> => {
  await storage.setItem(key, value);
};

export const getData = async (key: string): Promise<any> => {
  return storage.getItem(key);
};

export const removeData = async (key: string): Promise<void> => {
  await storage.removeItem(key);
};

export const clearAllData = async (): Promise<void> => {
  await storage.clear();
};

export default storage;
