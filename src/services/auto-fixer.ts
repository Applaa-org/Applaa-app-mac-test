/**
 * Auto-Fixer Service
 * Automatically fixes common code issues detected by CodeValidator
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { Problem } from './code-validator';

export interface FixResult {
  success: boolean;
  message: string;
  filesModified: string[];
}

export class AutoFixer {
  private appPath: string;
  private appType: 'mobile' | 'web' | 'flutter' | 'capacitor';

  constructor(appPath: string, appInfo?: { appType?: string; files?: string[] }) {
    this.appPath = appPath;
    
    // Detect app type for conditional fixes
    if (appInfo) {
      this.appType = this.detectAppType(appInfo);
    } else {
      this.appType = 'web'; // Default fallback
    }
  }

  /**
   * Detect app type from app info
   */
  private detectAppType(appInfo: { appType?: string; files?: string[] }): 'mobile' | 'web' | 'flutter' | 'capacitor' {
    // Use appType from database if available
    if (appInfo.appType === 'mobile') {
      return 'mobile';
    } else if (appInfo.appType === 'web') {
      return 'web';
    }
    
    return 'web'; // Default fallback
  }

  /**
   * Attempt to fix a problem automatically
   */
  async fixProblem(problem: Problem): Promise<FixResult> {
    if (!problem.autoFixable) {
      return {
        success: false,
        message: 'Problem is not auto-fixable',
        filesModified: []
      };
    }

    switch (problem.code) {
      case 'PLATFORM_HAPTICS':
        return await this.fixPlatformHaptics(problem);
      
      case 'MISSING_DEPENDENCY':
        return await this.fixMissingDependency(problem);
      
      case 'UNDICI_CORRUPTION':
      case 'INVALID_MAIN_ENTRY':
        return await this.fixCorruptedNodeModules(problem);
      
      case 'MODULE_NOT_FOUND':
        return await this.fixModuleNotFound(problem);
      
      case 'CORRUPTED_ASSET_FILE':
        return await this.fixCorruptedAssetFile(problem);
      
      default:
        return {
          success: false,
          message: `No auto-fix available for ${problem.code}`,
          filesModified: []
        };
    }
  }

  /**
   * Fix all auto-fixable problems
   */
  async fixAll(problems: Problem[]): Promise<FixResult> {
    const fixableProblems = problems.filter(p => p.autoFixable);
    const filesModified: string[] = [];
    let successCount = 0;

    for (const problem of fixableProblems) {
      const result = await this.fixProblem(problem);
      if (result.success) {
        successCount++;
        filesModified.push(...result.filesModified);
      }
    }

    // Remove duplicates
    const uniqueFiles = [...new Set(filesModified)];

    return {
      success: successCount > 0,
      message: `Fixed ${successCount}/${fixableProblems.length} problems`,
      filesModified: uniqueFiles
    };
  }

  /**
   * Fix Haptics API calls without Platform.OS checks
   */
  private async fixPlatformHaptics(problem: Problem): Promise<FixResult> {
    try {
      const filePath = path.join(this.appPath, problem.file);
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;

      // Add Platform import if missing
      const hasPlatformImport = /import.*Platform.*from ['"]react-native['"]/.test(content);
      
      if (!hasPlatformImport) {
        // Find existing react-native import and add Platform to it
        const reactNativeImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/;
        const match = content.match(reactNativeImportRegex);
        
        if (match) {
          // Add Platform to existing import
          const imports = match[1].trim();
          const newImports = imports + ', Platform';
          content = content.replace(
            reactNativeImportRegex,
            `import { ${newImports} } from 'react-native'`
          );
        } else {
          // Add new import at the top
          const firstImportIndex = content.indexOf('import');
          if (firstImportIndex !== -1) {
            content = content.slice(0, firstImportIndex) +
                     "import { Platform } from 'react-native';\n" +
                     content.slice(firstImportIndex);
          } else {
            content = "import { Platform } from 'react-native';\n\n" + content;
          }
        }
      }

      // Wrap Haptics calls in Platform.OS check
      // Match: Haptics.impactAsync(...) or await Haptics.impactAsync(...)
      const hapticCallRegex = /(await\s+)?Haptics\.(impact|notification|selection)Async\([^)]*\);?/g;
      
      content = content.replace(hapticCallRegex, (match) => {
        // Don't wrap if already inside a Platform check
        const beforeMatch = content.substring(0, content.indexOf(match));
        const lastPlatformCheck = beforeMatch.lastIndexOf('if (Platform.OS');
        const lastBrace = beforeMatch.lastIndexOf('}');
        
        if (lastPlatformCheck > lastBrace) {
          // Already inside a Platform check
          return match;
        }

        return `if (Platform.OS !== 'web') {\n      ${match}\n    }`;
      });

      // Only write if content changed
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf-8');
        
        return {
          success: true,
          message: 'Added Platform.OS check for Haptics API',
          filesModified: [problem.file]
        };
      }

      return {
        success: false,
        message: 'No changes needed',
        filesModified: []
      };
    } catch (error) {
      console.error('[AutoFixer] Error fixing platform haptics:', error);
      return {
        success: false,
        message: `Failed to fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: []
      };
    }
  }

  /**
   * Fix missing dependencies by adding them to package.json
   */
  private async fixMissingDependency(problem: Problem): Promise<FixResult> {
    try {
      // Extract package name from problem message
      const match = problem.message.match(/Missing dependency: ([\w@/-]+)/);
      if (!match) {
        return {
          success: false,
          message: 'Could not extract package name',
          filesModified: []
        };
      }

      const packageName = match[1];

      // Note: We don't actually install the package here
      // Instead, we return instructions for the IPC handler to do it
      return {
        success: true,
        message: `Need to install: ${packageName}`,
        filesModified: [`INSTALL:${packageName}`] // Special marker for IPC handler
      };
    } catch (error) {
      console.error('[AutoFixer] Error fixing missing dependency:', error);
      return {
        success: false,
        message: `Failed to fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: []
      };
    }
  }

  /**
   * Add Platform import to a file if missing
   */
  private async ensurePlatformImport(filePath: string): Promise<boolean> {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Check if Platform is already imported
      if (/import.*Platform.*from ['"]react-native['"]/.test(content)) {
        return true; // Already has import
      }

      // Find existing react-native import
      const reactNativeImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/;
      const match = content.match(reactNativeImportRegex);
      
      if (match) {
        // Add Platform to existing import
        const imports = match[1].trim();
        const newImports = imports + ', Platform';
        content = content.replace(
          reactNativeImportRegex,
          `import { ${newImports} } from 'react-native'`
        );
      } else {
        // Add new import at the top
        const firstImportIndex = content.indexOf('import');
        if (firstImportIndex !== -1) {
          content = content.slice(0, firstImportIndex) +
                   "import { Platform } from 'react-native';\n" +
                   content.slice(firstImportIndex);
        } else {
          content = "import { Platform } from 'react-native';\n\n" + content;
        }
      }

      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('[AutoFixer] Error adding Platform import:', error);
      return false;
    }
  }

  /**
   * 🚀 NEW: Fix corrupted node_modules (undici corruption, invalid main entries)
   * Only for mobile apps (Expo) since web apps don't use expo start
   */
  private async fixCorruptedNodeModules(problem: Problem): Promise<FixResult> {
    try {
      if (this.appType !== 'mobile') {
        console.log(`[AutoFixer] Skipping node_modules fix for ${this.appType} app - not needed`);
        return {
          success: false,
          message: `Node_modules corruption fix only applies to mobile (Expo) apps`,
          filesModified: []
        };
      }

      console.log('[AutoFixer] Fixing corrupted node_modules for mobile app...');
      
      const nodeModulesPath = path.join(this.appPath, 'node_modules');
      const packageLockPath = path.join(this.appPath, 'package-lock.json');
      
      // Remove corrupted files
      if (await fs.pathExists(nodeModulesPath)) {
        await fs.remove(nodeModulesPath);
        console.log('[AutoFixer] Removed corrupted node_modules');
      }
      
      if (await fs.pathExists(packageLockPath)) {
        await fs.remove(packageLockPath);
        console.log('[AutoFixer] Removed corrupted package-lock.json');
      }
      
      return {
        success: true,
        message: 'Corrupted node_modules removed - will reinstall dependencies',
        filesModified: ['REMOVE_NODE_MODULES', 'REMOVE_PACKAGE_LOCK']
      };
    } catch (error) {
      console.error('[AutoFixer] Error fixing corrupted node_modules:', error);
      return {
        success: false,
        message: `Failed to fix corrupted node_modules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: []
      };
    }
  }

  /**
   * 🚀 NEW: Fix module not found issues
   */
  private async fixModuleNotFound(problem: Problem): Promise<FixResult> {
    try {
      // Extract module name from problem message
      const match = problem.message.match(/Missing or corrupted module: ([\w@/-]+)/);
      if (!match) {
        return {
          success: false,
          message: 'Could not extract module name from error',
          filesModified: []
        };
      }

      const moduleName = match[1];
      console.log(`[AutoFixer] Fixing module not found: ${moduleName}`);

      return {
        success: true,
        message: `Need to reinstall module: ${moduleName}`,
        filesModified: [`REINSTALL_MODULE:${moduleName}`]
      };
    } catch (error) {
      console.error('[AutoFixer] Error fixing module not found:', error);
      return {
        success: false,
        message: `Failed to fix module not found: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: []
      };
    }
  }

  /**
   * 🚀 NEW: Fix corrupted asset files (empty files that cause Metro bundling errors)
   */
  private async fixCorruptedAssetFile(problem: Problem): Promise<FixResult> {
    try {
      console.log('[AutoFixer] Fixing corrupted asset file...');
      
      // Extract file path from problem message or file property
      let assetPath = problem.file;
      if (assetPath === 'Unknown asset' && problem.message.includes('file:')) {
        const pathMatch = problem.message.match(/file:\s*([^)]+)/);
        if (pathMatch) {
          assetPath = pathMatch[1];
        }
      }
      
      if (!assetPath || assetPath === 'Unknown asset') {
        return {
          success: false,
          message: 'Could not determine asset file path from error',
          filesModified: []
        };
      }

      // Check if file exists and is empty (0 bytes)
      const fullPath = path.join(this.appPath, assetPath);
      if (await fs.pathExists(fullPath)) {
        const stats = await fs.stat(fullPath);
        if (stats.size === 0) {
          console.log(`[AutoFixer] Found empty asset file: ${assetPath} (${stats.size} bytes)`);
          
          // Create a placeholder 1x1 pixel PNG file
          const placeholderPng = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64'
          );
          
          await fs.writeFile(fullPath, placeholderPng);
          console.log(`[AutoFixer] Replaced empty file with placeholder PNG: ${assetPath}`);
          
          return {
            success: true,
            message: `Replaced empty asset file with placeholder: ${assetPath}`,
            filesModified: [assetPath]
          };
        } else {
          console.log(`[AutoFixer] Asset file is not empty: ${assetPath} (${stats.size} bytes)`);
          return {
            success: false,
            message: `Asset file is not empty: ${assetPath} (${stats.size} bytes)`,
            filesModified: []
          };
        }
      } else {
        console.log(`[AutoFixer] Asset file does not exist: ${assetPath}`);
        return {
          success: false,
          message: `Asset file does not exist: ${assetPath}`,
          filesModified: []
        };
      }
    } catch (error) {
      console.error('[AutoFixer] Error fixing corrupted asset file:', error);
      return {
        success: false,
        message: `Failed to fix corrupted asset file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filesModified: []
      };
    }
  }
}
