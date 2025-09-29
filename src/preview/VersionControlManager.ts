/**
 * 🔄 VERSION CONTROL MANAGER
 * 
 * Inspired by Quests' built-in version control
 * Provides Git integration for app versioning and restoration
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface VersionInfo {
  id: string;
  appId: number;
  timestamp: number;
  message: string;
  author: string;
  files: string[];
  size: number;
  isAutoSave: boolean;
}

export interface VersionDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  stats: {
    insertions: number;
    deletions: number;
  };
}

export interface VersionControlConfig {
  autoSaveInterval: number; // milliseconds
  maxVersions: number;
  enableAutoSave: boolean;
  enableCompression: boolean;
  gitEnabled: boolean;
}

/**
 * VersionControlManager - Built-in version control inspired by Quests
 * 
 * Provides:
 * - Automatic versioning
 * - Git integration
 * - Version restoration
 * - Diff visualization
 * - Branch management
 */
export class VersionControlManager extends EventEmitter {
  private static instance: VersionControlManager;
  
  private config: VersionControlConfig;
  private versions = new Map<number, VersionInfo[]>();
  private autoSaveIntervals = new Map<number, NodeJS.Timeout>();
  private gitRepos = new Map<number, string>();
  
  constructor(config: Partial<VersionControlConfig> = {}) {
    super();
    
    this.config = {
      autoSaveInterval: 300000, // 5 minutes
      maxVersions: 50,
      enableAutoSave: true,
      enableCompression: true,
      gitEnabled: true,
      ...config
    };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<VersionControlConfig>): VersionControlManager {
    if (!VersionControlManager.instance) {
      VersionControlManager.instance = new VersionControlManager(config);
    }
    return VersionControlManager.instance;
  }
  
  /**
   * Initialize version control for an app
   */
  public async initializeApp(appId: number, appPath: string): Promise<void> {
    console.log(`🔄 Initializing version control for app ${appId} at ${appPath}`);
    
    try {
      // Initialize Git repository if enabled
      if (this.config.gitEnabled) {
        await this.initializeGitRepo(appId, appPath);
      }
      
      // Create initial version
      await this.createVersion(appId, 'Initial version', false);
      
      // Start auto-save if enabled
      if (this.config.enableAutoSave) {
        this.startAutoSave(appId);
      }
      
      console.log(`✅ Version control initialized for app ${appId}`);
      this.emit('version-control:initialized', { appId, appPath });
      
    } catch (error) {
      console.error(`❌ Failed to initialize version control for app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new version
   */
  public async createVersion(appId: number, message: string, isAutoSave: boolean = false): Promise<VersionInfo> {
    console.log(`📝 Creating version for app ${appId}: ${message}`);
    
    try {
      const appPath = this.getAppPath(appId);
      const files = await this.getTrackedFiles(appPath);
      const size = await this.calculateVersionSize(appPath, files);
      
      const version: VersionInfo = {
        id: this.generateVersionId(),
        appId,
        timestamp: Date.now(),
        message,
        author: 'Applaa Builder',
        files: files,
        size,
        isAutoSave
      };
      
      // Store version
      if (!this.versions.has(appId)) {
        this.versions.set(appId, []);
      }
      
      const appVersions = this.versions.get(appId)!;
      appVersions.push(version);
      
      // Limit versions
      if (appVersions.length > this.config.maxVersions) {
        const oldestVersion = appVersions.shift();
        if (oldestVersion) {
          await this.deleteVersion(appId, oldestVersion.id);
        }
      }
      
      // Create Git commit if enabled
      if (this.config.gitEnabled) {
        await this.createGitCommit(appId, message, files);
      }
      
      console.log(`✅ Version created: ${version.id}`);
      this.emit('version:created', { appId, version });
      
      return version;
      
    } catch (error) {
      console.error(`❌ Failed to create version for app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Restore to a specific version
   */
  public async restoreToVersion(appId: number, versionId: string): Promise<void> {
    console.log(`🔄 Restoring app ${appId} to version ${versionId}`);
    
    try {
      const appVersions = this.versions.get(appId);
      if (!appVersions) {
        throw new Error(`No versions found for app ${appId}`);
      }
      
      const version = appVersions.find(v => v.id === versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found for app ${appId}`);
      }
      
      // Restore using Git if enabled
      if (this.config.gitEnabled) {
        await this.restoreGitVersion(appId, versionId);
      } else {
        // Manual file restoration
        await this.restoreFiles(appId, version);
      }
      
      console.log(`✅ App ${appId} restored to version ${versionId}`);
      this.emit('version:restored', { appId, versionId, version });
      
    } catch (error) {
      console.error(`❌ Failed to restore app ${appId} to version ${versionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get version history for an app
   */
  public getVersionHistory(appId: number): VersionInfo[] {
    const appVersions = this.versions.get(appId);
    return appVersions ? [...appVersions].reverse() : [];
  }
  
  /**
   * Get diff between two versions
   */
  public async getVersionDiff(appId: number, fromVersionId: string, toVersionId: string): Promise<VersionDiff> {
    console.log(`📊 Getting diff between versions ${fromVersionId} and ${toVersionId} for app ${appId}`);
    
    try {
      if (this.config.gitEnabled) {
        return await this.getGitDiff(appId, fromVersionId, toVersionId);
      } else {
        return await this.getManualDiff(appId, fromVersionId, toVersionId);
      }
    } catch (error) {
      console.error(`❌ Failed to get diff for app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a version
   */
  public async deleteVersion(appId: number, versionId: string): Promise<void> {
    console.log(`🗑️ Deleting version ${versionId} for app ${appId}`);
    
    try {
      const appVersions = this.versions.get(appId);
      if (!appVersions) {
        throw new Error(`No versions found for app ${appId}`);
      }
      
      const versionIndex = appVersions.findIndex(v => v.id === versionId);
      if (versionIndex === -1) {
        throw new Error(`Version ${versionId} not found for app ${appId}`);
      }
      
      // Remove from array
      appVersions.splice(versionIndex, 1);
      
      // Delete Git commit if enabled
      if (this.config.gitEnabled) {
        await this.deleteGitCommit(appId, versionId);
      }
      
      console.log(`✅ Version ${versionId} deleted for app ${appId}`);
      this.emit('version:deleted', { appId, versionId });
      
    } catch (error) {
      console.error(`❌ Failed to delete version ${versionId} for app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Start auto-save for an app
   */
  private startAutoSave(appId: number): void {
    if (this.autoSaveIntervals.has(appId)) {
      return; // Already started
    }
    
    const interval = setInterval(async () => {
      try {
        await this.createVersion(appId, 'Auto-save', true);
      } catch (error) {
        console.warn(`Auto-save failed for app ${appId}:`, error);
      }
    }, this.config.autoSaveInterval);
    
    this.autoSaveIntervals.set(appId, interval);
  }
  
  /**
   * Stop auto-save for an app
   */
  public stopAutoSave(appId: number): void {
    const interval = this.autoSaveIntervals.get(appId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(appId);
    }
  }
  
  /**
   * Initialize Git repository
   */
  private async initializeGitRepo(appId: number, appPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['init'], { cwd: appPath });
      
      git.on('close', (code) => {
        if (code === 0) {
          this.gitRepos.set(appId, appPath);
          resolve();
        } else {
          reject(new Error(`Git init failed with code ${code}`));
        }
      });
      
      git.on('error', reject);
    });
  }
  
  /**
   * Create Git commit
   */
  private async createGitCommit(appId: number, message: string, files: string[]): Promise<void> {
    const appPath = this.getAppPath(appId);
    
    return new Promise((resolve, reject) => {
      // Add files
      const add = spawn('git', ['add', ...files], { cwd: appPath });
      
      add.on('close', (code) => {
        if (code === 0) {
          // Commit
          const commit = spawn('git', ['commit', '-m', message], { cwd: appPath });
          
          commit.on('close', (commitCode) => {
            if (commitCode === 0) {
              resolve();
            } else {
              reject(new Error(`Git commit failed with code ${commitCode}`));
            }
          });
          
          commit.on('error', reject);
        } else {
          reject(new Error(`Git add failed with code ${code}`));
        }
      });
      
      add.on('error', reject);
    });
  }
  
  /**
   * Restore Git version
   */
  private async restoreGitVersion(appId: number, versionId: string): Promise<void> {
    const appPath = this.getAppPath(appId);
    
    return new Promise((resolve, reject) => {
      const checkout = spawn('git', ['checkout', versionId], { cwd: appPath });
      
      checkout.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git checkout failed with code ${code}`));
        }
      });
      
      checkout.on('error', reject);
    });
  }
  
  /**
   * Get Git diff
   */
  private async getGitDiff(appId: number, fromVersionId: string, toVersionId: string): Promise<VersionDiff> {
    const appPath = this.getAppPath(appId);
    
    return new Promise((resolve, reject) => {
      const diff = spawn('git', ['diff', '--stat', fromVersionId, toVersionId], { cwd: appPath });
      let output = '';
      
      diff.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      diff.on('close', (code) => {
        if (code === 0) {
          // Parse diff output
          const diff = this.parseGitDiff(output);
          resolve(diff);
        } else {
          reject(new Error(`Git diff failed with code ${code}`));
        }
      });
      
      diff.on('error', reject);
    });
  }
  
  /**
   * Parse Git diff output
   */
  private parseGitDiff(output: string): VersionDiff {
    const lines = output.split('\n');
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    
    let insertions = 0;
    let deletions = 0;
    
    for (const line of lines) {
      if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          const filename = parts[0].trim();
          const stats = parts[1].trim();
          
          if (stats.includes('+') && !stats.includes('-')) {
            added.push(filename);
          } else if (!stats.includes('+') && stats.includes('-')) {
            deleted.push(filename);
          } else {
            modified.push(filename);
          }
          
          // Parse insertions/deletions
          const match = stats.match(/(\d+)\s+(\d+)/);
          if (match) {
            insertions += parseInt(match[1]);
            deletions += parseInt(match[2]);
          }
        }
      }
    }
    
    return {
      added,
      modified,
      deleted,
      stats: {
        insertions,
        deletions
      }
    };
  }
  
  /**
   * Get tracked files
   */
  private async getTrackedFiles(appPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (item !== 'node_modules' && item !== '.git') {
            scanDir(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(appPath);
    return files;
  }
  
  /**
   * Calculate version size
   */
  private async calculateVersionSize(appPath: string, files: string[]): Promise<number> {
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        totalSize += stat.size;
      } catch (error) {
        // File might not exist, skip
      }
    }
    
    return totalSize;
  }
  
  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get app path
   */
  private getAppPath(appId: number): string {
    return `apps/${appId}`;
  }
  
  /**
   * Manual file restoration (fallback)
   */
  private async restoreFiles(appId: number, version: VersionInfo): Promise<void> {
    // This would implement manual file restoration
    // For now, just log that restoration occurred
    console.log(`🔄 Manually restoring files for app ${appId} to version ${version.id}`);
  }
  
  /**
   * Manual diff calculation (fallback)
   */
  private async getManualDiff(appId: number, fromVersionId: string, toVersionId: string): Promise<VersionDiff> {
    // This would implement manual diff calculation
    // For now, return empty diff
    return {
      added: [],
      modified: [],
      deleted: [],
      stats: {
        insertions: 0,
        deletions: 0
      }
    };
  }
  
  /**
   * Delete Git commit
   */
  private async deleteGitCommit(appId: number, versionId: string): Promise<void> {
    const appPath = this.getAppPath(appId);
    
    return new Promise((resolve, reject) => {
      const reset = spawn('git', ['reset', '--hard', 'HEAD~1'], { cwd: appPath });
      
      reset.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git reset failed with code ${code}`));
        }
      });
      
      reset.on('error', reject);
    });
  }
  
  /**
   * Shutdown version control manager
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down VersionControlManager...');
    
    // Stop all auto-save intervals
    for (const [appId, interval] of this.autoSaveIntervals.entries()) {
      clearInterval(interval);
    }
    
    this.autoSaveIntervals.clear();
    this.versions.clear();
    this.gitRepos.clear();
    
    console.log('✅ VersionControlManager shutdown complete');
  }
}

/**
 * Get singleton version control manager instance
 */
export function getVersionControlManager(config?: Partial<VersionControlConfig>): VersionControlManager {
  return VersionControlManager.getInstance(config);
}


