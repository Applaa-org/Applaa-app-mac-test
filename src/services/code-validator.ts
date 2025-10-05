/**
 * Code Validator Service
 * Validates Expo apps before preview to ensure professional quality
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

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

  constructor(appPath: string) {
    this.appPath = appPath;
  }

  /**
   * Main validation entry point
   */
  async validateApp(): Promise<ValidationResult> {
    const problems: Problem[] = [];

    try {
      // Run all validators
      problems.push(...await this.checkPlatformAPIs());
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

        // Check for Haptics without Platform.OS check
        if (content.includes('Haptics.') && content.includes('expo-haptics')) {
          const hasImport = /import.*Platform.*from ['"]react-native['"]/.test(content);
          const hasPlatformCheck = /Platform\.OS\s*[!=]=\s*['"]web['"]/.test(content) ||
                                   /Platform\.select/.test(content);

          if (!hasPlatformCheck) {
            const hapticLines = lines
              .map((line, idx) => ({ line, idx }))
              .filter(({ line }) => /Haptics\.(impact|notification|selection)/.test(line));

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
      const packageJsonPath = path.join(this.appPath, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        return problems;
      }

      const packageJson = await fs.readJSON(packageJsonPath);
      const installedDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
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
      console.error('[CodeValidator] Error checking dependencies:', error);
    }

    return problems;
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
