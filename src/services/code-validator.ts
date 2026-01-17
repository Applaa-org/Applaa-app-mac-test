/**
 * Code Validator Service
 * Validates Expo apps before preview to ensure professional quality
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { detectAppCategory, AppCategory } from '../utils/appTypeDetection';
import { webSafePreviewValidator } from './web-safe-preview';

export interface Problem {
  type: 'error' | 'warning' | 'info';
  category: 'syntax' | 'dependency' | 'runtime' | 'platform';
  file: string;
  line?: number;
  column?: number;
  message: string;
  fix?: string;
  autoFixable: boolean;
  code?: string; // Error code for categorization
}

export interface ValidationResult {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  problems: Problem[];
  isValidForPreview: boolean;
  timestamp: number;
}

export class CodeValidator {
  private appPath: string;
  private appType: AppCategory;

  constructor(appPath: string, appInfo?: { appType?: string; files?: string[] }) {
    this.appPath = appPath;

    // Detect app type for conditional validation
    if (appInfo) {
      this.appType = this.detectAppType(appInfo);
    } else {
      // Fallback: detect from filesystem
      this.appType = this.detectAppTypeFromFilesystem();
    }
  }

  /**
   * Detect app type from app info
   */
  private detectAppType(appInfo: { appType?: string; files?: string[] }): AppCategory {
    // Use appType from database if available
    if (appInfo.appType === 'mobile') {
      return 'mobile';
    } else if (appInfo.appType === 'web') {
      return 'web';
    }

    // Fallback to file-based detection
    if (appInfo.files) {
      const mockApp = { id: 0, files: appInfo.files } as any;
      return detectAppCategory(mockApp);
    }

    return 'web'; // Default fallback
  }

  /**
   * Detect app type from filesystem (fallback method)
   */
  private detectAppTypeFromFilesystem(): AppCategory {
    try {
      const files = fs.readdirSync(this.appPath, { recursive: true }) as string[];
      const mockApp = { id: 0, files } as any;
      return detectAppCategory(mockApp);
    } catch (error) {
      console.warn('[CodeValidator] Could not detect app type from filesystem, defaulting to web:', error);
      return 'web';
    }
  }

  /**
   * Main validation entry point
   */
  async validateApp(): Promise<ValidationResult> {
    const problems: Problem[] = [];

    try {
      // Run all validators
      problems.push(...await this.checkPlatformAPIs());
      problems.push(...await this.checkWebCompatibility()); // NEW: Web compatibility check
      problems.push(...await this.checkDependencies());
      problems.push(...await this.checkCommonPatterns());
    } catch (error) {
      console.error('[CodeValidator] Validation error:', error);
      problems.push({
        type: 'error',
        category: 'runtime',
        file: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoFixable: false
      });
    }

    const errors = problems.filter(p => p.type === 'error').length;
    const warnings = problems.filter(p => p.type === 'warning').length;
    const info = problems.filter(p => p.type === 'info').length;

    return {
      total: problems.length,
      errors,
      warnings,
      info,
      problems,
      isValidForPreview: errors === 0, // Only block on errors, not warnings
      timestamp: Date.now()
    };
  }

  /**
   * Check for web compatibility issues in preview mode
   * This ensures native modules don't break web preview
   */
  private async checkWebCompatibility(): Promise<Problem[]> {
    const problems: Problem[] = [];
    const files = await this.getAllSourceFiles();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(this.appPath, file);

        // Skip if file should be excluded from web preview
        if (webSafePreviewValidator.shouldExcludeFromWebPreview(relativePath)) {
          continue;
        }

        // Check for web compatibility issues
        const webIssues = webSafePreviewValidator.checkWebCompatibility(relativePath, content);

        if (webIssues.length > 0) {
          // Convert to Problem format
          // Cast to any[] because WebSafePreviewValidator returns a structure that doesn't strictly match shared/tsc_types.Problem
          const webProblems = webSafePreviewValidator.convertToProblems(relativePath, webIssues) as any[];

          // Map to CodeValidator Problem type
          const mappedProblems: Problem[] = webProblems.map(p => ({
            type: p.severity === 'error' ? 'error' : 'warning',
            category: 'runtime', // Best fit categorization
            file: relativePath,
            line: p.line,
            column: p.column,
            message: p.message,
            fix: undefined, // webSafePreviewValidator doesn't provide fixes in this format
            autoFixable: !!p.autoFixable,
            code: String(p.code)
          }));

          problems.push(...mappedProblems);
        }
      } catch (error) {
        console.warn(`Failed to check web compatibility for ${file}:`, error);
      }
    }

    return problems;
  }

  /**
   * Check for platform-specific API usage without proper guards
   * This catches the most common error: Haptics on web
   */
  private async checkPlatformAPIs(): Promise<Problem[]> {
    const problems: Problem[] = [];
    const files = await this.getAllSourceFiles();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Check for Haptics without Platform.OS check (both Haptics and Haptic variations)
        if ((content.includes('Haptics.') || content.includes('Haptic.')) && content.includes('expo-haptics')) {
          const hasImport = /import.*Platform.*from ['"]react-native['"]/.test(content);
          const hasPlatformCheck = /Platform\.OS\s*[!=]=\s*['"]web['"]/.test(content) ||
            /Platform\.select/.test(content);

          if (!hasPlatformCheck) {
            const hapticLines = lines
              .map((line, idx) => ({ line, idx }))
              .filter(({ line }) => /(Haptics?|Haptic)\.(impact|notification|selection)/.test(line));

            for (const { line, idx } of hapticLines) {
              problems.push({
                type: 'error',
                category: 'platform',
                file: path.relative(this.appPath, file),
                line: idx + 1,
                message: 'Haptic feedback API used without Platform.OS check',
                fix: hasImport
                  ? `Wrap in: if (Platform.OS !== 'web') { ... }`
                  : `Add: import { Platform } from 'react-native'; then wrap in if (Platform.OS !== 'web') { ... }`,
                autoFixable: true,
                code: 'PLATFORM_HAPTICS'
              });
            }
          }
        }

        // Check for Camera without Platform.OS check
        if (content.includes('expo-camera') && /Camera\./.test(content)) {
          const hasPlatformCheck = /Platform\.OS/.test(content);
          if (!hasPlatformCheck) {
            problems.push({
              type: 'warning',
              category: 'platform',
              file: path.relative(this.appPath, file),
              message: 'Camera API may behave differently on web',
              fix: 'Consider adding Platform.OS checks for platform-specific behavior',
              autoFixable: false,
              code: 'PLATFORM_CAMERA'
            });
          }
        }

        // Check for useNativeDriver without Platform check
        if (/useNativeDriver:\s*true/.test(content)) {
          const hasPlatformCheck = /Platform\.OS/.test(content);
          if (!hasPlatformCheck) {
            const driverLines = lines
              .map((line, idx) => ({ line, idx }))
              .filter(({ line }) => /useNativeDriver:\s*true/.test(line));

            for (const { idx } of driverLines) {
              problems.push({
                type: 'warning',
                category: 'platform',
                file: path.relative(this.appPath, file),
                line: idx + 1,
                message: 'useNativeDriver may not be supported on all platforms',
                fix: 'Consider adding Platform.OS check or fallback to JS driver',
                autoFixable: false,
                code: 'PLATFORM_NATIVE_DRIVER'
              });
            }
          }
        }

        // Check for other platform-specific APIs
        const platformAPIs = [
          { api: 'Biometrics', module: 'expo-local-authentication', name: 'Biometric authentication' },
          { api: 'FaceDetector', module: 'expo-face-detector', name: 'Face detection' },
          { api: 'BarCodeScanner', module: 'expo-barcode-scanner', name: 'Barcode scanning' }
        ];

        for (const { api, name } of platformAPIs) {
          if (content.includes(api) && !/Platform\.OS/.test(content)) {
            problems.push({
              type: 'warning',
              category: 'platform',
              file: path.relative(this.appPath, file),
              message: `${name} may not be available on all platforms`,
              fix: 'Add Platform.OS check before using',
              autoFixable: false,
              code: `PLATFORM_${api.toUpperCase()}`
            });
          }
        }
      } catch (error) {
        console.error(`[CodeValidator] Error checking file ${file}:`, error);
      }
    }

    return problems;
  }

  /**
   * Check for missing dependencies
   */
  private async checkDependencies(): Promise<Problem[]> {
    const problems: Problem[] = [];

    try {
      // 1. Static analysis of imports (existing logic)
      problems.push(...await this.checkStaticDependencies());

      // 2. 🚀 NEW: Run expo start to catch real dependency issues (ONLY for mobile apps)
      if (this.appType === 'mobile') {
        console.log('[CodeValidator] Detected mobile app - running expo start dependency check...');
        problems.push(...await this.checkDependenciesWithExpoStart());
      } else {
        console.log(`[CodeValidator] Detected ${this.appType} app - skipping expo start check (not needed)`);
      }
    } catch (error) {
      console.error('[CodeValidator] Error checking dependencies:', error);
    }

    return problems;
  }

  /**
   * Static analysis of imports (original logic)
   */
  private async checkStaticDependencies(): Promise<Problem[]> {
    const problems: Problem[] = [];

    try {
      const packageJsonPath = path.join(this.appPath, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        return problems;
      }

      const packageJson = await fs.readJSON(packageJsonPath);
      const installedDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const files = await this.getAllSourceFiles();

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];

          // Skip relative imports
          if (importPath.startsWith('.') || importPath.startsWith('/')) {
            continue;
          }

          // Extract package name (handle scoped packages)
          const packageName = importPath.startsWith('@')
            ? importPath.split('/').slice(0, 2).join('/')
            : importPath.split('/')[0];

          // Check if package is installed
          if (!installedDeps[packageName]) {
            // Check if it's a built-in or pre-installed package
            const preInstalled = [
              'react', 'react-native', 'expo', 'expo-router', 'expo-status-bar',
              '@expo/vector-icons', 'react-native-safe-area-context'
            ];

            if (!preInstalled.includes(packageName)) {
              problems.push({
                type: 'error',
                category: 'dependency',
                file: path.relative(this.appPath, file),
                message: `Missing dependency: ${packageName}`,
                fix: `Install with: npm install ${packageName}`,
                autoFixable: true,
                code: 'MISSING_DEPENDENCY'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[CodeValidator] Error in static dependency check:', error);
    }

    return problems;
  }

  /**
   * 🚀 NEW: Run expo start to catch real dependency issues (like undici corruption)
   */
  private async checkDependenciesWithExpoStart(): Promise<Problem[]> {
    const problems: Problem[] = [];

    try {
      console.log('[CodeValidator] Running expo start to check for dependency issues...');

      // Import spawn dynamically to avoid issues
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const expoProcess = spawn('npx', ['expo', 'start', '--web'], {
          cwd: this.appPath,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            EXPO_NO_DOCTOR: '1',
            EXPO_NO_UPDATE_CHECK: '1',
            EXPO_NO_TYPESCRIPT_SETUP: '1',
            EXPO_NO_WEB_SETUP: '1',
            METRO_NO_INTERACTIVE: '1',
            CI: '1'
          }
        });

        let stdout = '';
        let stderr = '';
        let hasError = false;

        // Set a timeout to kill the process
        const timeout = setTimeout(() => {
          if (!expoProcess.killed) {
            expoProcess.kill('SIGTERM');
            console.log('[CodeValidator] Expo start timeout - process killed');
          }
        }, 10000); // 10 second timeout


        expoProcess.stderr?.on('data', (data) => {
          stderr += data.toString();

          // Check for specific dependency errors
          const errorOutput = data.toString();

          // Check for undici corruption
          if (errorOutput.includes("Cannot find module") && errorOutput.includes("undici")) {
            problems.push({
              type: 'error',
              category: 'dependency',
              file: 'node_modules/undici',
              message: 'Undici module is corrupted - missing index.js file',
              fix: 'Remove node_modules and package-lock.json, then run npm install',
              autoFixable: true,
              code: 'UNDICI_CORRUPTION'
            });
            hasError = true;
          }

          // Check for other module not found errors
          const moduleNotFoundMatch = errorOutput.match(/Cannot find module ['"]([^'"]+)['"]/);
          if (moduleNotFoundMatch) {
            const missingModule = moduleNotFoundMatch[1];
            problems.push({
              type: 'error',
              category: 'dependency',
              file: `node_modules/${missingModule}`,
              message: `Missing or corrupted module: ${missingModule}`,
              fix: `Reinstall module: npm install ${missingModule}`,
              autoFixable: true,
              code: 'MODULE_NOT_FOUND'
            });
            hasError = true;
          }

          // Check for package.json main entry issues
          if (errorOutput.includes('Please verify that the package.json has a valid "main" entry')) {
            problems.push({
              type: 'error',
              category: 'dependency',
              file: 'node_modules',
              message: 'Corrupted node_modules - invalid package.json main entries',
              fix: 'Remove node_modules and package-lock.json, then run npm install',
              autoFixable: true,
              code: 'INVALID_MAIN_ENTRY'
            });
            hasError = true;
          }
        });

        expoProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
          const output = data.toString();

          // Look for successful startup indicators
          if (output.includes('Metro waiting on') ||
            output.includes('Ready!') ||
            output.includes('Starting Metro Bundler')) {
            clearTimeout(timeout);
            expoProcess.kill('SIGTERM');
            console.log('[CodeValidator] ✅ Expo start successful - no dependency issues detected');
            resolve(problems);
          }

          // 🚀 NEW: Check for Metro bundling errors in stdout
          if (output.includes('error') || output.includes('Error') || output.includes('ERROR')) {
            console.log('[CodeValidator] Metro bundling error detected in stdout:', output);

            // Check for specific asset errors
            if (output.includes('unsupported file type') || output.includes('asset')) {
              const assetErrorMatch = output.match(/assets[^:]+:\s*unsupported file type:\s*(\w+)/);
              const assetPathMatch = output.match(/file:\s*([^)]+)/);

              if (assetErrorMatch || assetPathMatch) {
                const assetPath = assetPathMatch ? assetPathMatch[1] : 'Unknown asset';
                const fileType = assetErrorMatch ? assetErrorMatch[1] : 'undefined';

                problems.push({
                  type: 'error',
                  category: 'runtime',
                  file: assetPath,
                  message: `Asset file has unsupported file type: ${fileType} (likely corrupted or empty file)`,
                  fix: 'Replace the corrupted/empty asset file with a valid image file',
                  autoFixable: false,
                  code: 'CORRUPTED_ASSET_FILE'
                });
              } else {
                problems.push({
                  type: 'error',
                  category: 'runtime',
                  file: 'Metro Bundler',
                  message: 'Metro bundler encountered an asset processing error',
                  fix: 'Check for corrupted, empty, or unsupported asset files',
                  autoFixable: false,
                  code: 'METRO_ASSET_ERROR'
                });
              }
            } else {
              problems.push({
                type: 'error',
                category: 'runtime',
                file: 'Metro Bundler',
                message: 'Metro bundler encountered an error during compilation',
                fix: 'Check for missing dependencies, syntax errors, or asset issues',
                autoFixable: false,
                code: 'METRO_BUNDLING_ERROR'
              });
            }
            hasError = true;
          }
        });

        expoProcess.on('close', (code) => {
          clearTimeout(timeout);
          if (hasError) {
            console.log('[CodeValidator] ❌ Expo start failed - dependency issues detected');
          } else if (code !== 0) {
            console.log('[CodeValidator] ⚠️ Expo start exited with code:', code);
          } else {
            console.log('[CodeValidator] ✅ Expo start completed successfully');
          }
          resolve(problems);
        });

        expoProcess.on('error', (error) => {
          clearTimeout(timeout);
          console.log('[CodeValidator] ❌ Expo start process error:', error.message);
          resolve(problems);
        });
      });

    } catch (error) {
      console.error('[CodeValidator] Error running expo start check:', error);
      return problems;
    }
  }

  /**
   * Check for common code patterns that cause issues
   */
  private async checkCommonPatterns(): Promise<Problem[]> {
    const problems: Problem[] = [];
    const files = await this.getAllSourceFiles();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Check for web patterns in React Native code
        if (/className\s*=/.test(content)) {
          const classNameLines = lines
            .map((line, idx) => ({ line, idx }))
            .filter(({ line }) => /className\s*=/.test(line));

          for (const { idx } of classNameLines) {
            problems.push({
              type: 'error',
              category: 'syntax',
              file: path.relative(this.appPath, file),
              line: idx + 1,
              message: 'React Native does not support className prop',
              fix: 'Use style prop with StyleSheet.create()',
              autoFixable: false,
              code: 'WEB_PATTERN_CLASSNAME'
            });
          }
        }

        // Check for div/span instead of View/Text
        const webElements = ['<div', '<span', '<button', '<input'];
        for (const element of webElements) {
          if (content.includes(element)) {
            problems.push({
              type: 'error',
              category: 'syntax',
              file: path.relative(this.appPath, file),
              message: `HTML elements not supported in React Native (found ${element})`,
              fix: 'Use React Native components: View, Text, Pressable, TextInput',
              autoFixable: false,
              code: 'WEB_PATTERN_HTML'
            });
            break; // Only report once per file
          }
        }

        // Check for async functions without error handling
        const asyncFunctions = content.match(/async\s+\w+\s*\([^)]*\)\s*{/g);
        if (asyncFunctions && !/try\s*{/.test(content)) {
          problems.push({
            type: 'info',
            category: 'runtime',
            file: path.relative(this.appPath, file),
            message: 'Async function without try-catch error handling',
            fix: 'Consider adding try-catch blocks for better error handling',
            autoFixable: false,
            code: 'NO_ERROR_HANDLING'
          });
        }
      } catch (error) {
        console.error(`[CodeValidator] Error checking patterns in ${file}:`, error);
      }
    }

    return problems;
  }

  /**
   * Get all source files in the app
   */
  private async getAllSourceFiles(): Promise<string[]> {
    try {
      const patterns = [
        path.join(this.appPath, '**/*.{ts,tsx,js,jsx}'),
      ];

      const ignorePatterns = [
        '**/node_modules/**',
        '**/.expo/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ];

      const files: string[] = [];
      for (const pattern of patterns) {
        const matches = await glob(pattern, {
          ignore: ignorePatterns,
          absolute: true
        });
        files.push(...matches);
      }

      return files;
    } catch (error) {
      console.error('[CodeValidator] Error getting source files:', error);
      return [];
    }
  }
}
