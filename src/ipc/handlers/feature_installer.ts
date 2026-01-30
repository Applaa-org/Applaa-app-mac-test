import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { execAsync } from '../utils/runShellCommand';

const logger = log.scope("feature-installer");

/**
 * 🚀 ON-DEMAND FEATURE INSTALLER
 * 
 * Allows LLMs to:
 * 1. Copy feature files from expo-templates/features
 * 2. Install required dependencies
 * 3. Update package.json automatically
 * 
 * This saves space and improves performance by only adding what's needed.
 */
export function registerFeatureInstaller() {

  // List available features
  ipcMain.handle("feature:list", async () => {
    try {
      const featuresPath = path.join(__dirname, '../../../expo-templates/features');
      const features = [];
      
      if (fs.existsSync(featuresPath)) {
        const featureDirs = fs.readdirSync(featuresPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const featureDir of featureDirs) {
          const packageAdditionsPath = path.join(featuresPath, featureDir, 'package-additions.json');
          
          if (fs.existsSync(packageAdditionsPath)) {
            const packageData = JSON.parse(fs.readFileSync(packageAdditionsPath, 'utf8'));
            features.push({
              name: featureDir,
              description: packageData.description || `${featureDir} feature`,
              features: packageData.features || [],
              dependencies: Object.keys(packageData.dependencies || {}),
              size: Object.keys(packageData.dependencies || {}).length
            });
          }
        }
      }
      
      return { success: true, features };
    } catch (error) {
      logger.error("Failed to list features:", error);
      return { success: false, error: error.message };
    }
  });

  // Install a specific feature
  ipcMain.handle("feature:install", async (_, params: { 
    appId: number; 
    featureName: string;
    copyFiles?: boolean;
    installDependencies?: boolean;
  }) => {
    const { appId, featureName, copyFiles = true, installDependencies = true } = params;
    logger.info(`🚀 Installing feature '${featureName}' for app ${appId}`);

    try {
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      const featuresPath = path.join(__dirname, '../../../expo-templates/features');
      const featurePath = path.join(featuresPath, featureName);
      
      if (!fs.existsSync(featurePath)) {
        throw new Error(`Feature '${featureName}' not found`);
      }

      // Read package additions
      const packageAdditionsPath = path.join(featurePath, 'package-additions.json');
      if (!fs.existsSync(packageAdditionsPath)) {
        throw new Error(`Feature '${featureName}' missing package-additions.json`);
      }

      const packageAdditions = JSON.parse(fs.readFileSync(packageAdditionsPath, 'utf8'));
      const results = {
        filesCopied: [],
        dependenciesInstalled: [],
        errors: []
      };

      // Copy feature files if requested
      if (copyFiles) {
        const copyFeatureFiles = (srcDir: string, destDir: string, relativePath = '') => {
          if (!fs.existsSync(srcDir)) return;
          
          const items = fs.readdirSync(srcDir, { withFileTypes: true });
          
          for (const item of items) {
            const srcPath = path.join(srcDir, item.name);
            const destPath = path.join(destDir, item.name);
            const relPath = path.join(relativePath, item.name);
            
            // Skip package-additions.json
            if (item.name === 'package-additions.json') continue;
            
            if (item.isDirectory()) {
              if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
              }
              copyFeatureFiles(srcPath, destPath, relPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
              results.filesCopied.push(relPath);
              logger.info(`📁 Copied: ${relPath}`);
            }
          }
        };

        copyFeatureFiles(featurePath, appPath);
      }

      // Install dependencies if requested
      if (installDependencies && packageAdditions.dependencies) {
        const packageJsonPath = path.join(appPath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          // Read current package.json
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Merge dependencies
          if (!packageJson.dependencies) packageJson.dependencies = {};
          
          for (const [dep, version] of Object.entries(packageAdditions.dependencies)) {
            packageJson.dependencies[dep] = version;
            results.dependenciesInstalled.push(`${dep}@${version}`);
          }
          
          // Write updated package.json
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          logger.info(`📦 Updated package.json with ${results.dependenciesInstalled.length} dependencies`);
          
          // Update app.json if feature has config updates
          if (packageAdditions.configUpdates?.['app.json']) {
            const appJsonPath = path.join(appPath, 'app.json');
            if (fs.existsSync(appJsonPath)) {
              const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
              const configUpdates = packageAdditions.configUpdates['app.json'];
              
              // Merge plugins if specified
              if (configUpdates.plugins) {
                if (!appJson.expo.plugins) appJson.expo.plugins = [];
                configUpdates.plugins.forEach(plugin => {
                  // Check if plugin already exists
                  const existingIndex = appJson.expo.plugins.findIndex(p => 
                    Array.isArray(p) ? p[0] === plugin[0] : p === plugin
                  );
                  if (existingIndex === -1) {
                    appJson.expo.plugins.push(plugin);
                  }
                });
              }
              
              // Update features list
              if (!appJson.expo.extra) appJson.expo.extra = {};
              if (!appJson.expo.extra.applaa) appJson.expo.extra.applaa = {};
              if (!appJson.expo.extra.applaa.features) appJson.expo.extra.applaa.features = [];
              
              if (!appJson.expo.extra.applaa.features.includes(featureName)) {
                appJson.expo.extra.applaa.features.push(featureName);
              }
              
              fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
              logger.info(`📱 Updated app.json with ${featureName} configuration`);
            }
          }
          
          // Install the new dependencies
          try {
            logger.info(`📥 Installing dependencies for app ${appId}...`);
            await execAsync('npm install --legacy-peer-deps', {
              cwd: appPath,
              timeout: 120000, // 2 minutes
              env: {
                ...process.env,
                CI: '1',
                NPM_CONFIG_AUDIT: 'false',
                NPM_CONFIG_FUND: 'false'
              }
            });
            logger.info(`✅ Dependencies installed successfully for app ${appId}`);
            
            // 🚀 PARALLEL PREBUILD: Handle dynamic package installation
            try {
              const { handleDynamicPackageInstall } = await import('./parallel_prebuild_system');
              const newPackages = Object.keys(packageAdditions.dependencies || {});
              await handleDynamicPackageInstall(appId, newPackages);
            } catch (prebuildError) {
              logger.warn(`⚠️ Failed to handle dynamic package install for prebuild:`, prebuildError);
            }
            
          } catch (installError) {
            logger.warn(`⚠️ Dependency installation failed, but feature files were copied:`, installError);
            results.errors.push(`Dependency installation failed: ${installError.message}`);
          }
        }
      }

      logger.info(`✅ Feature '${featureName}' installed for app ${appId}`);
      return { 
        success: true, 
        results,
        message: `Feature '${featureName}' installed successfully`
      };

    } catch (error) {
      logger.error(`❌ Failed to install feature '${featureName}' for app ${appId}:`, error);
      return { 
        success: false, 
        error: error.message,
        featureName,
        appId
      };
    }
  });

  // Check if a feature is already installed
  ipcMain.handle("feature:check", async (_, params: { appId: number; featureName: string }) => {
    const { appId, featureName } = params;
    
    try {
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        return { success: false, error: "App not found" };
      }

      const appPath = getDyadAppPath(appData.path);
      const packageJsonPath = path.join(appPath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return { success: true, installed: false, reason: "No package.json" };
      }

      // Read feature requirements
      const featuresPath = path.join(__dirname, '../../../expo-templates/features');
      const packageAdditionsPath = path.join(featuresPath, featureName, 'package-additions.json');
      
      if (!fs.existsSync(packageAdditionsPath)) {
        return { success: false, error: `Feature '${featureName}' not found` };
      }

      const packageAdditions = JSON.parse(fs.readFileSync(packageAdditionsPath, 'utf8'));
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if all required dependencies are present
      const missingDeps = [];
      if (packageAdditions.dependencies) {
        for (const dep of Object.keys(packageAdditions.dependencies)) {
          if (!packageJson.dependencies?.[dep]) {
            missingDeps.push(dep);
          }
        }
      }
      
      const installed = missingDeps.length === 0;
      
      return { 
        success: true, 
        installed,
        missingDependencies: missingDeps,
        reason: installed ? "All dependencies present" : `Missing: ${missingDeps.join(', ')}`
      };

    } catch (error) {
      logger.error(`Failed to check feature '${featureName}':`, error);
      return { success: false, error: error.message };
    }
  });
}
