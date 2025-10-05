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

  constructor(appPath: string) {
    this.appPath = appPath;
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
}
