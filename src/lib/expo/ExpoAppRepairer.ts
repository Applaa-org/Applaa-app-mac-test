import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

/**
 * 🚀 EXPO APP REPAIRER - Dynamic Dependency Repair System
 * 
 * This system can fix ANY broken Expo app by:
 * 1. Detecting missing/incompatible dependencies
 * 2. Auto-updating package.json with correct dependencies
 * 3. Installing missing packages automatically
 * 4. Resolving version conflicts
 * 5. Making old apps work with current Expo versions
 */

interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
}

// Simple logger
const logger: Logger = {
  info: (msg) => console.log(`[ExpoAppRepairer] ${msg}`),
  warn: (msg) => console.warn(`[ExpoAppRepairer] ${msg}`),
  error: (msg, err) => console.error(`[ExpoAppRepairer] ${msg}`, err || ''),
  debug: (msg) => console.debug(`[ExpoAppRepairer] ${msg}`)
};

/**
 * Current recommended versions for Expo SDK 53
 */
const RECOMMENDED_VERSIONS = {
  // Core Expo
  'expo': '~53.0.0',
  'expo-router': '~4.0.0',
  'expo-linking': '~7.0.0',
  
  // React & React Native
  'react': '18.2.0',
  'react-dom': '18.3.1',
  'react-native': '0.79.4',
  'react-native-web': '~0.19.13',
  
  // Essential Expo packages
  'expo-status-bar': '~2.0.0',
  'expo-linear-gradient': '~14.0.1',
  'expo-font': '~13.0.1',
  'expo-constants': '~17.0.3',
  'expo-device': '~7.0.1',
  'expo-splash-screen': '~0.29.13',
  'expo-image': '~2.0.0',
  'expo-system-ui': '~4.0.4',
  
  // UI & Icons
  '@expo/vector-icons': '^15.0.0',
  'react-native-svg': '15.9.0',
  'lucide-react-native': '^0.460.0',
  
  // Navigation & Gestures
  'react-native-safe-area-context': '4.14.0',
  'react-native-screens': '4.2.0',
  'react-native-gesture-handler': '~2.20.2',
  
  // Storage
  '@react-native-async-storage/async-storage': '1.25.0',
  
  // Dev Dependencies
  '@babel/core': '^7.25.2',
  '@types/react': '~18.2.0',
  'typescript': '~5.3.3',
  '@expo/config-plugins': '^8.0.0'
};

/**
 * Critical dependencies that MUST be present
 */
const CRITICAL_DEPENDENCIES = [
  'expo',
  'expo-router', 
  'react',
  'react-native',
  '@expo/config-plugins',
  'undici', // 🚀 CRITICAL: Add undici to critical dependencies (common corruption issue)
  '@babel/core',
  'typescript'
];

export interface AppRepairResult {
  success: boolean;
  repaired: boolean;
  issues: string[];
  fixes: string[];
  warnings: string[];
  updatedDependencies: string[];
  installedPackages: string[];
}

export class ExpoAppRepairer {
  private appPath: string;
  private packageJsonPath: string;

  constructor(appPath: string) {
    this.appPath = appPath;
    this.packageJsonPath = path.join(appPath, 'package.json');
  }

  /**
   * 🚀 MAIN REPAIR FUNCTION - Fixes any broken Expo app
   */
  async repairApp(): Promise<AppRepairResult> {
    const result: AppRepairResult = {
      success: false,
      repaired: false,
      issues: [],
      fixes: [],
      warnings: [],
      updatedDependencies: [],
      installedPackages: []
    };

    try {
      logger.info(`🔧 Starting repair process for: ${this.appPath}`);

      // Step 1: Validate app structure
      const structureValid = await this.validateAppStructure();
      if (!structureValid) {
        result.issues.push('Invalid app structure - missing package.json or node_modules');
        return result;
      }

      // Step 2: Analyze current dependencies
      const analysis = await this.analyzeDependencies();
      result.issues.push(...analysis.issues);
      result.warnings.push(...analysis.warnings);

      // Step 3: Repair package.json if needed
      if (analysis.needsRepair) {
        logger.info('📝 Repairing package.json...');
        const repairResult = await this.repairPackageJson(analysis);
        result.fixes.push(...repairResult.fixes);
        result.updatedDependencies.push(...repairResult.updatedDependencies);
        result.repaired = true;
      }

      // Step 4: Install missing dependencies
      if (analysis.missingDependencies.length > 0) {
        logger.info(`📦 Installing ${analysis.missingDependencies.length} missing dependencies...`);
        const installResult = await this.installMissingDependencies(analysis.missingDependencies);
        result.fixes.push(...installResult.fixes);
        result.installedPackages.push(...installResult.installedPackages);
        result.repaired = true;
      }

      // Step 5: Fix node_modules corruption
      const nodeModulesFixed = await this.fixNodeModulesCorruption();
      if (nodeModulesFixed) {
        result.fixes.push('Fixed corrupted node_modules directory');
        result.repaired = true;
      }

      // Step 6: Fix code issues
      if (analysis.codeIssues.length > 0) {
        logger.info('🔧 Fixing code issues...');
        const codeFixResult = await this.fixCodeIssues(analysis.codeIssues);
        result.fixes.push(...codeFixResult.fixes);
        result.repaired = true;
      }

      // Step 7: Validate final state
      const finalValidation = await this.validateFinalState();
      result.success = finalValidation.isValid;
      
      if (result.success) {
        logger.info('✅ App repair completed successfully');
        result.fixes.push('App is now ready for preview');
      } else {
        result.issues.push('App repair failed - manual intervention may be required');
      }

      return result;

    } catch (error) {
      logger.error('Failed to repair app:', error);
      result.issues.push(`Repair process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validate basic app structure
   */
  private async validateAppStructure(): Promise<boolean> {
    try {
      // Check if package.json exists
      if (!fs.existsSync(this.packageJsonPath)) {
        logger.error('package.json not found');
        return false;
      }

      // Check if it's a valid JSON file
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      if (!packageJson.name || !packageJson.dependencies) {
        logger.error('Invalid package.json structure');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate app structure:', error);
      return false;
    }
  }

  /**
   * Analyze current dependencies and identify issues
   */
  private async analyzeDependencies(): Promise<{
    issues: string[];
    warnings: string[];
    needsRepair: boolean;
    missingDependencies: string[];
    outdatedDependencies: string[];
    corruptedModules: string[];
    codeIssues: string[];
  }> {
    const analysis = {
      issues: [],
      warnings: [],
      needsRepair: false,
      missingDependencies: [],
      outdatedDependencies: [],
      corruptedModules: [],
      codeIssues: []
    };

    try {
      // Read current package.json
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      // Check for missing critical dependencies
      for (const dep of CRITICAL_DEPENDENCIES) {
        if (!allDeps[dep]) {
          analysis.missingDependencies.push(dep);
          analysis.issues.push(`Missing critical dependency: ${dep}`);
          analysis.needsRepair = true;
        }
      }

      // Check for outdated versions
      for (const [dep, recommendedVersion] of Object.entries(RECOMMENDED_VERSIONS)) {
        if (allDeps[dep]) {
          const currentVersion = allDeps[dep];
          if (this.isVersionOutdated(currentVersion, recommendedVersion)) {
            analysis.outdatedDependencies.push(dep);
            analysis.warnings.push(`${dep} version ${currentVersion} may be outdated (recommended: ${recommendedVersion})`);
            analysis.needsRepair = true;
          }
        }
      }

      // Check for corrupted node_modules
      const nodeModulesPath = path.join(this.appPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        for (const dep of CRITICAL_DEPENDENCIES) {
          if (allDeps[dep]) {
            const modulePath = path.join(nodeModulesPath, dep);
            if (fs.existsSync(modulePath)) {
              // Check for specific corruption patterns
              if (dep === '@expo/config-plugins') {
                const buildPath = path.join(modulePath, 'build', 'index.js');
                if (!fs.existsSync(buildPath)) {
                  analysis.corruptedModules.push(dep);
                  analysis.issues.push(`Corrupted module: ${dep} - missing build/index.js`);
                  analysis.needsRepair = true;
                }
              }
              
              // 🚀 CRITICAL: Check for undici corruption (common with Node.js v22+)
              if (dep === 'undici') {
                const undiciIndexJs = path.join(modulePath, 'index.js');
                const undiciIndexTs = path.join(modulePath, 'index.d.ts');
                const undiciPackageJson = path.join(modulePath, 'package.json');
                
                // Check if undici is corrupted (has .d.ts but no .js)
                if (fs.existsSync(undiciIndexTs) && !fs.existsSync(undiciIndexJs)) {
                  analysis.corruptedModules.push(dep);
                  analysis.issues.push(`Corrupted module: ${dep} - missing index.js file (has TypeScript definitions but no JavaScript implementation)`);
                  analysis.needsRepair = true;
                  logger.warn('🚨 CRITICAL: Undici module is corrupted - has TypeScript definitions but no JavaScript implementation');
                } else if (fs.existsSync(undiciPackageJson)) {
                  // Check if undici has a valid main entry
                  try {
                    const packageJson = JSON.parse(fs.readFileSync(undiciPackageJson, 'utf8'));
                    const mainEntry = packageJson.main || 'index.js';
                    const mainFilePath = path.join(modulePath, mainEntry);
                    
                    if (!fs.existsSync(mainFilePath)) {
                      analysis.corruptedModules.push(dep);
                      analysis.issues.push(`Corrupted module: ${dep} - main entry '${mainEntry}' is missing`);
                      analysis.needsRepair = true;
                    }
                  } catch (error) {
                    analysis.corruptedModules.push(dep);
                    analysis.issues.push(`Corrupted module: ${dep} - package.json is invalid`);
                    analysis.needsRepair = true;
                  }
                } else {
                  analysis.corruptedModules.push(dep);
                  analysis.issues.push(`Corrupted module: ${dep} - missing package.json`);
                  analysis.needsRepair = true;
                }
              }
            } else {
              analysis.corruptedModules.push(dep);
              analysis.issues.push(`Missing module in node_modules: ${dep}`);
              analysis.needsRepair = true;
            }
          }
        }
      } else {
        analysis.issues.push('node_modules directory missing');
        analysis.needsRepair = true;
      }

      // 🚀 NEW: Check for common code issues that cause blank screens
      await this.analyzeCodeIssues(analysis);

      // 🚀 NEW: Check for file structure mismatches
      await this.analyzeFileStructure(analysis);

    } catch (error) {
      logger.error('Failed to analyze dependencies:', error);
      analysis.issues.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return analysis;
  }

  /**
   * Repair package.json with correct dependencies and versions
   */
  private async repairPackageJson(analysis: any): Promise<{
    fixes: string[];
    updatedDependencies: string[];
  }> {
    const result = {
      fixes: [],
      updatedDependencies: []
    };

    try {
      logger.info('📝 Updating package.json with correct dependencies...');

      // Read current package.json
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));

      // Ensure dependencies object exists
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
        result.fixes.push('Created missing dependencies object');
      }

      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
        result.fixes.push('Created missing devDependencies object');
      }

      // Add missing critical dependencies
      for (const dep of CRITICAL_DEPENDENCIES) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
          const version = RECOMMENDED_VERSIONS[dep];
          if (version) {
            // Add to appropriate section (dev vs regular)
            if (dep === '@expo/config-plugins' || dep === '@babel/core' || dep === 'typescript' || dep === '@types/react') {
              packageJson.devDependencies[dep] = version;
            } else {
              packageJson.dependencies[dep] = version;
            }
            result.updatedDependencies.push(`${dep}@${version}`);
            result.fixes.push(`Added missing dependency: ${dep}@${version}`);
          }
        }
      }

      // Update outdated dependencies
      for (const dep of analysis.outdatedDependencies) {
        const recommendedVersion = RECOMMENDED_VERSIONS[dep];
        if (recommendedVersion) {
          const currentVersion = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
          
          // Determine if it's a dev dependency
          const isDevDep = dep === '@expo/config-plugins' || dep === '@babel/core' || dep === 'typescript' || dep === '@types/react';
          
          if (isDevDep) {
            packageJson.devDependencies[dep] = recommendedVersion;
          } else {
            packageJson.dependencies[dep] = recommendedVersion;
          }
          
          result.updatedDependencies.push(`${dep}@${recommendedVersion} (was ${currentVersion})`);
          result.fixes.push(`Updated ${dep} from ${currentVersion} to ${recommendedVersion}`);
        }
      }

      // Ensure scripts section exists
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      // Add missing scripts
      const requiredScripts = {
        'start': 'expo start',
        'android': 'expo start --android',
        'ios': 'expo start --ios',
        'web': 'expo start --web'
      };

      for (const [script, command] of Object.entries(requiredScripts)) {
        if (!packageJson.scripts[script]) {
          packageJson.scripts[script] = command;
          result.fixes.push(`Added missing script: ${script}`);
        }
      }

      // Write updated package.json
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      result.fixes.push('Updated package.json with correct dependencies and versions');

    } catch (error) {
      logger.error('Failed to repair package.json:', error);
      throw error;
    }

    return result;
  }

  /**
   * Install missing dependencies
   */
  private async installMissingDependencies(missingDependencies: string[]): Promise<{
    fixes: string[];
    installedPackages: string[];
  }> {
    const result = {
      fixes: [],
      installedPackages: []
    };

    try {
      // Separate Expo packages from regular packages
      const expoPackages = missingDependencies.filter(dep => 
        dep.startsWith('expo-') || dep.startsWith('@expo/') || dep === 'expo'
      );
      const regularPackages = missingDependencies.filter(dep => !expoPackages.includes(dep));

      // Install Expo packages first
      if (expoPackages.length > 0) {
        const expoSuccess = await this.installWithExpo(expoPackages);
        if (expoSuccess) {
          result.installedPackages.push(...expoPackages);
          result.fixes.push(`Installed Expo packages: ${expoPackages.join(', ')}`);
        } else {
          // Fallback to npm
          const npmSuccess = await this.installWithNpm(expoPackages, true);
          if (npmSuccess) {
            result.installedPackages.push(...expoPackages);
            result.fixes.push(`Installed Expo packages via npm: ${expoPackages.join(', ')}`);
          }
        }
      }

      // Install regular packages
      if (regularPackages.length > 0) {
        const npmSuccess = await this.installWithNpm(regularPackages, false);
        if (npmSuccess) {
          result.installedPackages.push(...regularPackages);
          result.fixes.push(`Installed regular packages: ${regularPackages.join(', ')}`);
        }
      }

    } catch (error) {
      logger.error('Failed to install missing dependencies:', error);
      throw error;
    }

    return result;
  }

  /**
   * Fix corrupted node_modules by reinstalling
   */
  private async fixNodeModulesCorruption(): Promise<boolean> {
    try {
      const nodeModulesPath = path.join(this.appPath, 'node_modules');
      const packageLockPath = path.join(this.appPath, 'package-lock.json');
      
      if (fs.existsSync(nodeModulesPath)) {
        logger.info('🧹 Cleaning corrupted node_modules...');
        
        // Remove corrupted node_modules
        fs.removeSync(nodeModulesPath);
        
        // 🚀 CRITICAL: Remove package-lock.json to prevent undici corruption
        if (fs.existsSync(packageLockPath)) {
          logger.info('🗑️ Removing package-lock.json to prevent undici corruption...');
          fs.removeSync(packageLockPath);
        }
        
        // Reinstall all dependencies with clean cache
        logger.info('📦 Reinstalling all dependencies with clean cache...');
        const success = await this.runPackageManagerCommand('npm', [
          'install', 
          '--legacy-peer-deps',
          '--no-package-lock', // Prevent corrupted package-lock
          '--force' // Force clean install
        ], this.appPath);
        
        if (success) {
          logger.info('✅ node_modules reinstalled successfully');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to fix node_modules corruption:', error);
      return false;
    }
  }

  /**
   * Validate final state after repair
   */
  private async validateFinalState(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues = [];

    try {
      // Check if package.json is valid
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      
      // Check if all critical dependencies are present
      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      for (const dep of CRITICAL_DEPENDENCIES) {
        if (!allDeps[dep]) {
          issues.push(`Critical dependency still missing: ${dep}`);
        }
      }

      // Check if node_modules exists and has required modules
      const nodeModulesPath = path.join(this.appPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        issues.push('node_modules directory still missing');
      } else {
        for (const dep of CRITICAL_DEPENDENCIES) {
          if (allDeps[dep]) {
            const modulePath = path.join(nodeModulesPath, dep);
            if (!fs.existsSync(modulePath)) {
              issues.push(`Module still missing: ${dep}`);
            }
          }
        }
      }

    } catch (error) {
      issues.push(`Final validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 🚀 NEW: Fix common code issues that cause blank screens
   */
  private async fixCodeIssues(codeIssues: string[]): Promise<{ fixes: string[] }> {
    const result = { fixes: [] };

    try {
      logger.info(`🔧 Fixing ${codeIssues.length} code issues...`);

      for (const issue of codeIssues) {
        if (issue.includes('Incomplete LanguageContext.Provider')) {
          await this.fixLanguageContextProvider();
          result.fixes.push('Fixed incomplete LanguageContext.Provider tag');
        }

        if (issue.includes('Incomplete LanguageProvider')) {
          await this.fixLanguageProvider();
          result.fixes.push('Fixed incomplete LanguageProvider tag');
        }

        if (issue.includes('Missing import for SafeAreaView')) {
          await this.fixSafeAreaViewImport();
          result.fixes.push('Added missing SafeAreaView import');
        }

        if (issue.includes('Missing app/index.tsx')) {
          await this.createMissingIndexFile();
          result.fixes.push('Created missing app/index.tsx file');
        }

        if (issue.includes('Missing app/_layout.tsx')) {
          await this.createMissingLayoutFile();
          result.fixes.push('Created missing app/_layout.tsx file');
        }

        if (issue.includes('Expo Router configured but missing app/ directory')) {
          await this.createAppDirectory();
          result.fixes.push('Created missing app/ directory for Expo Router');
        }

        if (issue.includes('app.json main entry is expo-router/entry but app/ directory is missing')) {
          await this.createAppDirectory();
          result.fixes.push('Created app/ directory to match expo-router/entry configuration');
        }

        if (issue.includes('Missing app.json configuration file')) {
          await this.createAppJson();
          result.fixes.push('Created missing app.json configuration file');
        }
      }

    } catch (error) {
      logger.error('Failed to fix code issues:', error);
      result.fixes.push(`Code fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Fix incomplete LanguageContext.Provider tags
   */
  private async fixLanguageContextProvider(): Promise<void> {
    const appIndexFile = path.join(this.appPath, 'app', 'index.tsx');
    if (fs.existsSync(appIndexFile)) {
      let content = fs.readFileSync(appIndexFile, 'utf8');
      
      // Fix incomplete LanguageContext.Provider
      if (content.includes('<LanguageContext.Provider') && !content.includes('</LanguageContext.Provider>')) {
        content = content.replace(
          /<LanguageContext\.Provider[^>]*>/g,
          '<LanguageContext.Provider value={{ language, setLanguage, t }}>\n      {children}\n    </LanguageContext.Provider>'
        );
        fs.writeFileSync(appIndexFile, content);
      }
    }
  }

  /**
   * Fix incomplete LanguageProvider tags
   */
  private async fixLanguageProvider(): Promise<void> {
    const appIndexFile = path.join(this.appPath, 'app', 'index.tsx');
    if (fs.existsSync(appIndexFile)) {
      let content = fs.readFileSync(appIndexFile, 'utf8');
      
      // Fix incomplete LanguageProvider
      if (content.includes('<LanguageProvider>') && !content.includes('</LanguageProvider>')) {
        content = content.replace(
          /<LanguageProvider>/g,
          '<LanguageProvider>\n      {children}\n    </LanguageProvider>'
        );
        fs.writeFileSync(appIndexFile, content);
      }
    }
  }

  /**
   * Fix missing SafeAreaView import
   */
  private async fixSafeAreaViewImport(): Promise<void> {
    const appIndexFile = path.join(this.appPath, 'app', 'index.tsx');
    if (fs.existsSync(appIndexFile)) {
      let content = fs.readFileSync(appIndexFile, 'utf8');
      
      if (content.includes('SafeAreaView') && !content.includes("import { SafeAreaView }")) {
        // Add the missing import
        const importLine = "import { SafeAreaView } from 'react-native-safe-area-context';";
        content = importLine + '\n' + content;
        fs.writeFileSync(appIndexFile, content);
      }
    }
  }

  /**
   * Create missing index.tsx file
   */
  private async createMissingIndexFile(): Promise<void> {
    const appDir = path.join(this.appPath, 'app');
    const appIndexFile = path.join(appDir, 'index.tsx');
    
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    const indexContent = `import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Your app is ready! 🚀
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});
`;

    fs.writeFileSync(appIndexFile, indexContent);
  }

  /**
   * Create missing _layout.tsx file
   */
  private async createMissingLayoutFile(): Promise<void> {
    const appDir = path.join(this.appPath, 'app');
    const appLayoutFile = path.join(appDir, '_layout.tsx');
    
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    const layoutContent = `import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
`;

    fs.writeFileSync(appLayoutFile, layoutContent);
  }

  /**
   * Create missing app directory structure
   */
  private async createAppDirectory(): Promise<void> {
    const appDir = path.join(this.appPath, 'app');
    
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
      
      // Create basic Expo Router structure
      await this.createMissingIndexFile();
      await this.createMissingLayoutFile();
    }
  }

  /**
   * Create missing app.json configuration
   */
  private async createAppJson(): Promise<void> {
    const appJsonPath = path.join(this.appPath, 'app.json');
    
    const appJsonContent = {
      "expo": {
        "name": "Applaa App",
        "slug": "applaa-app",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/icon.png",
        "userInterfaceStyle": "automatic",
        "splash": {
          "image": "./assets/splash.png",
          "resizeMode": "contain",
          "backgroundColor": "#4F46E5"
        },
        "assetBundlePatterns": [
          "**/*"
        ],
        "ios": {
          "supportsTablet": true,
          "bundleIdentifier": "com.applaa.app"
        },
        "android": {
          "adaptiveIcon": {
            "foregroundImage": "./assets/adaptive-icon.png",
            "backgroundColor": "#4F46E5"
          },
          "package": "com.applaa.app"
        },
        "web": {
          "favicon": "./assets/favicon.png",
          "bundler": "metro"
        },
        "plugins": [
          "expo-router"
        ],
        "experiments": {
          "typedRoutes": true
        }
      }
    };

    fs.writeFileSync(appJsonPath, JSON.stringify(appJsonContent, null, 2));
  }

  /**
   * 🚀 NEW: Analyze file structure for mismatches
   */
  private async analyzeFileStructure(analysis: any): Promise<void> {
    try {
      logger.info('🔍 Analyzing file structure for mismatches...');

      // Check for Expo Router vs React Native CLI structure mismatch
      const hasAppDir = fs.existsSync(path.join(this.appPath, 'app'));
      const hasSrcDir = fs.existsSync(path.join(this.appPath, 'src'));
      const hasAppTsx = fs.existsSync(path.join(this.appPath, 'src', 'App.tsx'));
      const hasAppIndexTsx = fs.existsSync(path.join(this.appPath, 'app', 'index.tsx'));

      // Check package.json for routing configuration
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const hasExpoRouter = packageJson.dependencies?.['expo-router'] || packageJson.devDependencies?.['expo-router'];

      logger.info(`📁 File structure analysis:`);
      logger.info(`  - Has app/ directory: ${hasAppDir}`);
      logger.info(`  - Has src/ directory: ${hasSrcDir}`);
      logger.info(`  - Has src/App.tsx: ${hasAppTsx}`);
      logger.info(`  - Has app/index.tsx: ${hasAppIndexTsx}`);
      logger.info(`  - Has expo-router: ${!!hasExpoRouter}`);

      // Detect structure mismatch
      if (hasExpoRouter && hasAppDir && !hasAppTsx) {
        // This is correct Expo Router structure - no issues
        logger.info('✅ Correct Expo Router structure detected');
      } else if (!hasExpoRouter && hasSrcDir && hasAppTsx) {
        // This is correct React Native CLI structure - no issues
        logger.info('✅ Correct React Native CLI structure detected');
      } else if (hasExpoRouter && !hasAppDir) {
        // Expo Router configured but missing app directory
        analysis.codeIssues.push('Expo Router configured but missing app/ directory');
        analysis.issues.push('Missing app/ directory for Expo Router');
        analysis.needsRepair = true;
      } else if (hasExpoRouter && hasAppDir && !hasAppIndexTsx) {
        // Expo Router configured but missing main screen
        analysis.codeIssues.push('Expo Router configured but missing app/index.tsx');
        analysis.issues.push('Missing main screen file: app/index.tsx');
        analysis.needsRepair = true;
      } else if (!hasExpoRouter && !hasAppTsx && !hasSrcDir) {
        // No routing configured and no main files
        analysis.codeIssues.push('No routing configuration and missing main files');
        analysis.issues.push('Missing main app files - need either src/App.tsx or app/index.tsx');
        analysis.needsRepair = true;
      } else if (hasExpoRouter && hasAppTsx) {
        // Mixed structure - has both Expo Router and React Native CLI files
        analysis.codeIssues.push('Mixed routing structure - has both Expo Router and React Native CLI files');
        analysis.warnings.push('App has both Expo Router (app/) and React Native CLI (src/) structure - this may cause conflicts');
      }

      // Check for common file structure issues
      const appJsonPath = path.join(this.appPath, 'app.json');
      if (fs.existsSync(appJsonPath)) {
        try {
          const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
          
          // Check if main entry point matches actual structure
          const mainEntry = appJson.main || 'expo-router/entry';
          if (mainEntry === 'expo-router/entry' && !hasAppDir) {
            analysis.codeIssues.push('app.json configured for Expo Router but app/ directory missing');
            analysis.issues.push('app.json main entry is expo-router/entry but app/ directory is missing');
            analysis.needsRepair = true;
          } else if (mainEntry !== 'expo-router/entry' && hasAppDir) {
            analysis.codeIssues.push('app.json main entry does not match Expo Router structure');
            analysis.warnings.push('app.json main entry does not use expo-router/entry but app/ directory exists');
          }
        } catch (error) {
          analysis.codeIssues.push('Invalid app.json configuration');
          analysis.issues.push('app.json contains invalid JSON');
          analysis.needsRepair = true;
        }
      } else {
        analysis.codeIssues.push('Missing app.json configuration file');
        analysis.issues.push('Missing app.json file');
        analysis.needsRepair = true;
      }

      if (analysis.codeIssues.length > 0) {
        logger.warn(`🔍 Found ${analysis.codeIssues.length} file structure issues: ${analysis.codeIssues.join(', ')}`);
      } else {
        logger.info('✅ File structure is correct');
      }

    } catch (error) {
      logger.error('Failed to analyze file structure:', error);
      analysis.issues.push(`File structure analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🚀 NEW: Analyze code for common issues that cause blank screens
   */
  private async analyzeCodeIssues(analysis: any): Promise<void> {
    try {
      logger.info('🔍 Analyzing code for common issues...');

      // Check for common app structure issues
      const appDir = path.join(this.appPath, 'app');
      const appIndexFile = path.join(appDir, 'index.tsx');
      const appLayoutFile = path.join(appDir, '_layout.tsx');

      // Check if main app files exist
      if (!fs.existsSync(appIndexFile)) {
        analysis.codeIssues.push('Missing app/index.tsx - main screen file not found');
        analysis.issues.push('Missing main screen file: app/index.tsx');
        analysis.needsRepair = true;
      }

      if (!fs.existsSync(appLayoutFile)) {
        analysis.codeIssues.push('Missing app/_layout.tsx - root layout file not found');
        analysis.issues.push('Missing root layout file: app/_layout.tsx');
        analysis.needsRepair = true;
      }

      // Check for common syntax issues in key files
      if (fs.existsSync(appIndexFile)) {
        const indexContent = fs.readFileSync(appIndexFile, 'utf8');
        
        // Check for common issues that cause blank screens
        if (indexContent.includes('LanguageContext.Provider') && !indexContent.includes('</LanguageContext.Provider>')) {
          analysis.codeIssues.push('Incomplete LanguageContext.Provider - missing closing tag');
          analysis.issues.push('Syntax error: Incomplete LanguageContext.Provider tag');
          analysis.needsRepair = true;
        }

        if (indexContent.includes('<LanguageProvider>') && !indexContent.includes('</LanguageProvider>')) {
          analysis.codeIssues.push('Incomplete LanguageProvider - missing closing tag');
          analysis.issues.push('Syntax error: Incomplete LanguageProvider tag');
          analysis.needsRepair = true;
        }

        // Check for empty or placeholder content
        if (indexContent.includes('🚨 APPLAA TEMPLATE FILE - PLACEHOLDER')) {
          analysis.codeIssues.push('App still contains placeholder content - needs actual implementation');
          analysis.warnings.push('App contains placeholder content that may not render properly');
        }

        // Check for missing imports
        if (indexContent.includes('SafeAreaView') && !indexContent.includes("import { SafeAreaView }")) {
          analysis.codeIssues.push('Missing import for SafeAreaView component');
          analysis.issues.push('Missing import: SafeAreaView from react-native-safe-area-context');
          analysis.needsRepair = true;
        }
      }

      // Check for TypeScript compilation errors
      try {
        const { spawn } = await import('child_process');
        await new Promise<void>((resolve, reject) => {
          const child = spawn('npx', ['tsc', '--noEmit'], {
            cwd: this.appPath,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let stderr = '';
          child.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            if (code !== 0 && stderr) {
              analysis.codeIssues.push(`TypeScript compilation errors: ${stderr.substring(0, 200)}...`);
              analysis.issues.push('TypeScript compilation failed - syntax errors detected');
              analysis.needsRepair = true;
            }
            resolve();
          });

          child.on('error', () => resolve()); // Ignore spawn errors
          
          // Timeout after 10 seconds
          setTimeout(() => {
            child.kill();
            resolve();
          }, 10000);
        });
      } catch (error) {
        logger.debug('Could not check TypeScript compilation:', error);
      }

      if (analysis.codeIssues.length > 0) {
        logger.warn(`🔍 Found ${analysis.codeIssues.length} code issues: ${analysis.codeIssues.join(', ')}`);
      } else {
        logger.info('✅ No code issues detected');
      }

    } catch (error) {
      logger.error('Failed to analyze code issues:', error);
      analysis.issues.push(`Code analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Install packages using expo install
   */
  private async installWithExpo(packages: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      if (packages.length === 0) {
        resolve(true);
        return;
      }

      logger.info(`🚀 Running: npx expo install ${packages.join(' ')}`);
      
      const child = spawn("npx", ["expo", "install", ...packages], {
        cwd: this.appPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          EXPO_NO_DOCTOR: "1",
          EXPO_NO_UPDATE_CHECK: "1",
          EXPO_NO_TELEMETRY: "1"
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        logger.debug(`[expo install] ${data.toString().trim()}`);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.debug(`[expo install:err] ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info("✅ Expo install completed successfully");
          resolve(true);
        } else {
          logger.error(`❌ Expo install failed with code ${code}`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        logger.error("❌ Expo install process error:", error);
        resolve(false);
      });

      // Timeout after 3 minutes
      setTimeout(() => {
        child.kill();
        logger.error("❌ Expo install timed out");
        resolve(false);
      }, 180000);
    });
  }

  /**
   * Install packages using npm
   */
  private async installWithNpm(packages: string[], useLegacyPeerDeps: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      const args = ["install"];
      
      if (useLegacyPeerDeps) {
        args.push("--legacy-peer-deps");
      }
      
      if (packages.length > 0) {
        args.push("--prefer-offline", "--no-audit", "--no-fund", ...packages);
      } else {
        args.push("--prefer-offline", "--no-audit", "--no-fund");
      }
      
      logger.info(`🚀 Running: npm ${args.join(' ')}`);
      
      const child = spawn("npm", args, {
        cwd: this.appPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        logger.debug(`[npm install] ${data.toString().trim()}`);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.debug(`[npm install:err] ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info("✅ npm install completed successfully");
          resolve(true);
        } else {
          logger.error(`❌ npm install failed with code ${code}`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        logger.error("❌ npm install process error:", error);
        resolve(false);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        child.kill();
        logger.error("❌ npm install timed out");
        resolve(false);
      }, 300000);
    });
  }

  /**
   * Check if a version is outdated compared to recommended
   */
  private isVersionOutdated(current: string, recommended: string): boolean {
    // Simple version comparison - could be enhanced
    try {
      const currentNum = parseFloat(current.replace(/[^\d.]/g, ''));
      const recommendedNum = parseFloat(recommended.replace(/[^\d.]/g, ''));
      return currentNum < recommendedNum;
    } catch {
      return false;
    }
  }
}
