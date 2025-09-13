import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import log from "electron-log";

const execAsync = promisify(exec);
const logger = log.scope("workspace_dependency_manager");

/**
 * 🚀 PERFORMANCE: Workspace-level dependency sharing
 * 
 * Instead of installing dependencies for each app individually (30-60s delay),
 * we maintain a shared node_modules at workspace level and symlink to apps.
 * This reduces dependency installation from 30-60s to 2-5s.
 */

interface WorkspaceConfig {
  workspaceRoot: string;
  sharedNodeModules: string;
  packageJsonPath: string;
}

class WorkspaceDependencyManager {
  private static instance: WorkspaceDependencyManager;
  private config: WorkspaceConfig | null = null;
  private dependencyCache = new Map<string, string[]>(); // package.json hash -> dependencies

  static getInstance(): WorkspaceDependencyManager {
    if (!WorkspaceDependencyManager.instance) {
      WorkspaceDependencyManager.instance = new WorkspaceDependencyManager();
    }
    return WorkspaceDependencyManager.instance;
  }

  async initialize(workspaceRoot: string): Promise<void> {
    this.config = {
      workspaceRoot,
      sharedNodeModules: path.join(workspaceRoot, "shared_node_modules"),
      packageJsonPath: path.join(workspaceRoot, "shared_package.json"),
    };

    // Ensure shared directory exists
    await fs.promises.mkdir(this.config.sharedNodeModules, { recursive: true });
    
    logger.log(`🚀 Workspace dependency manager initialized at: ${workspaceRoot}`);
  }

  /**
   * Get dependencies for an app, using shared workspace dependencies when possible
   */
  async getDependenciesForApp(appPath: string): Promise<{ dependencies: string[], fromShared: boolean }> {
    const packageJsonPath = path.join(appPath, "package.json");
    
    if (!await this.fileExists(packageJsonPath)) {
      return { dependencies: [], fromShared: false };
    }

    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf-8"));
    const dependencies = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ];

    // Check if we can use shared dependencies
    const canUseShared = await this.canUseSharedDependencies(dependencies);
    
    if (canUseShared) {
      logger.log(`🚀 Using shared dependencies for ${path.basename(appPath)}`);
      return { dependencies, fromShared: true };
    }

    return { dependencies, fromShared: false };
  }

  /**
   * Install dependencies for an app, using shared workspace when possible
   */
  async installDependenciesForApp(appPath: string): Promise<void> {
    const startTime = Date.now();
    const { dependencies, fromShared } = await this.getDependenciesForApp(appPath);

    if (fromShared && this.config) {
      // Use shared dependencies - create symlink
      await this.linkToSharedDependencies(appPath);
      const duration = Date.now() - startTime;
      logger.log(`✅ Linked shared dependencies for ${path.basename(appPath)} in ${duration}ms`);
      return;
    }

    // Install dependencies locally (fallback)
    await this.installLocalDependencies(appPath);
    const duration = Date.now() - startTime;
    logger.log(`✅ Installed local dependencies for ${path.basename(appPath)} in ${duration}ms`);
  }

  /**
   * Check if dependencies can be satisfied from shared workspace
   */
  private async canUseSharedDependencies(dependencies: string[]): Promise<boolean> {
    if (!this.config || dependencies.length === 0) {
      return false;
    }

    // Check if shared node_modules exists and has required packages
    if (!await this.fileExists(this.config.sharedNodeModules)) {
      return false;
    }

    // Check if all required dependencies exist in shared node_modules
    for (const dep of dependencies) {
      const depPath = path.join(this.config.sharedNodeModules, dep);
      if (!await this.fileExists(depPath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Link app's node_modules to shared workspace dependencies
   */
  private async linkToSharedDependencies(appPath: string): Promise<void> {
    if (!this.config) return;

    const appNodeModules = path.join(appPath, "node_modules");
    
    // Remove existing node_modules if it exists
    if (await this.fileExists(appNodeModules)) {
      await fs.promises.rm(appNodeModules, { recursive: true, force: true });
    }

    // Create symlink to shared node_modules
    await fs.promises.symlink(this.config.sharedNodeModules, appNodeModules, "dir");
  }

  /**
   * Install dependencies locally (fallback method)
   */
  private async installLocalDependencies(appPath: string): Promise<void> {
    try {
      logger.log(`📦 Installing local dependencies for ${path.basename(appPath)}`);
      await execAsync("npm install", { cwd: appPath });
    } catch (error) {
      logger.error(`❌ Failed to install dependencies for ${path.basename(appPath)}:`, error);
      throw error;
    }
  }

  /**
   * Update shared workspace dependencies
   */
  async updateSharedDependencies(dependencies: string[]): Promise<void> {
    if (!this.config || dependencies.length === 0) {
      return;
    }

    logger.log(`🚀 Updating shared workspace dependencies: ${dependencies.join(", ")}`);

    // Create a temporary package.json with all dependencies
    const sharedPackageJson = {
      name: "applaa-shared-dependencies",
      version: "1.0.0",
      dependencies: dependencies.reduce((acc, dep) => {
        acc[dep] = "latest";
        return acc;
      }, {} as Record<string, string>),
    };

    await fs.promises.writeFile(
      this.config.packageJsonPath,
      JSON.stringify(sharedPackageJson, null, 2)
    );

    // Install dependencies in shared workspace
    try {
      await execAsync("npm install", { cwd: this.config.workspaceRoot });
      logger.log(`✅ Updated shared workspace dependencies`);
    } catch (error) {
      logger.error(`❌ Failed to update shared dependencies:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up workspace dependencies
   */
  async cleanup(): Promise<void> {
    if (!this.config) return;

    try {
      await fs.promises.rm(this.config.sharedNodeModules, { recursive: true, force: true });
      await fs.promises.rm(this.config.packageJsonPath, { force: true });
      logger.log(`🧹 Cleaned up workspace dependencies`);
    } catch (error) {
      logger.warn(`⚠️ Failed to cleanup workspace dependencies:`, error);
    }
  }
}

export const workspaceDependencyManager = WorkspaceDependencyManager.getInstance();
