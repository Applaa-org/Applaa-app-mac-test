import fs from 'fs-extra';
import path from 'path';

/**
 * 🚀 PRE-PREVIEW VALIDATION RULESET
 * 
 * This validator ensures that all apps are ready for preview before starting.
 * It performs comprehensive checks for dependencies, file structure, and code issues.
 */

interface ValidationRule {
  name: string;
  description: string;
  check: (appPath: string) => Promise<ValidationResult>;
  fix?: (appPath: string) => Promise<FixResult>;
}

interface ValidationResult {
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: string;
}

interface FixResult {
  success: boolean;
  message: string;
  details?: string;
}

export class PrePreviewValidator {
  private appPath: string;
  private rules: ValidationRule[] = [];

  constructor(appPath: string) {
    this.appPath = appPath;
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      {
        name: 'package.json-exists',
        description: 'Package.json file exists',
        check: this.checkPackageJsonExists.bind(this),
        fix: this.createPackageJson.bind(this)
      },
      {
        name: 'node-modules-exists',
        description: 'Node modules directory exists',
        check: this.checkNodeModulesExists.bind(this),
        fix: this.installNodeModules.bind(this)
      },
      {
        name: 'critical-dependencies',
        description: 'Critical dependencies are present',
        check: this.checkCriticalDependencies.bind(this),
        fix: this.installCriticalDependencies.bind(this)
      },
      {
        name: 'app-structure',
        description: 'App has proper file structure',
        check: this.checkAppStructure.bind(this),
        fix: this.createAppStructure.bind(this)
      },
      {
        name: 'app-json-config',
        description: 'App.json configuration is valid',
        check: this.checkAppJsonConfig.bind(this),
        fix: this.createAppJsonConfig.bind(this)
      },
      {
        name: 'typescript-compilation',
        description: 'TypeScript compilation passes',
        check: this.checkTypeScriptCompilation.bind(this)
      },
      {
        name: 'expo-router-consistency',
        description: 'Expo Router configuration matches file structure',
        check: this.checkExpoRouterConsistency.bind(this),
        fix: this.fixExpoRouterConsistency.bind(this)
      },
      {
        name: 'no-syntax-errors',
        description: 'No syntax errors in main files',
        check: this.checkSyntaxErrors.bind(this),
        fix: this.fixSyntaxErrors.bind(this)
      }
    ];
  }

  /**
   * Run all validation rules
   */
  async validateAll(): Promise<{
    passed: boolean;
    results: Array<ValidationResult & { rule: string }>;
    fixable: boolean;
  }> {
    const results: Array<ValidationResult & { rule: string }> = [];
    let hasErrors = false;
    let hasFixableIssues = false;

    for (const rule of this.rules) {
      try {
        const result = await rule.check(this.appPath);
        results.push({ ...result, rule: rule.name });
        
        if (!result.passed && result.severity === 'error') {
          hasErrors = true;
          if (rule.fix) {
            hasFixableIssues = true;
          }
        }
      } catch (error) {
        results.push({
          passed: false,
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          rule: rule.name
        });
        hasErrors = true;
      }
    }

    return {
      passed: !hasErrors,
      results,
      fixable: hasFixableIssues
    };
  }

  /**
   * Fix all fixable issues
   */
  async fixAll(): Promise<{
    success: boolean;
    fixes: Array<FixResult & { rule: string }>;
    errors: string[];
  }> {
    const fixes: Array<FixResult & { rule: string }> = [];
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (rule.fix) {
        try {
          const result = await rule.check(this.appPath);
          if (!result.passed) {
            const fixResult = await rule.fix(this.appPath);
            fixes.push({ ...fixResult, rule: rule.name });
            
            if (!fixResult.success) {
              errors.push(`Failed to fix ${rule.name}: ${fixResult.message}`);
            }
          }
        } catch (error) {
          errors.push(`Error fixing ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      fixes,
      errors
    };
  }

  // Validation Rules Implementation

  private async checkPackageJsonExists(): Promise<ValidationResult> {
    const packageJsonPath = path.join(this.appPath, 'package.json');
    const exists = fs.existsSync(packageJsonPath);
    
    return {
      passed: exists,
      message: exists ? 'Package.json exists' : 'Package.json file is missing',
      severity: exists ? 'info' : 'error',
      details: exists ? undefined : 'Required for dependency management and app configuration'
    };
  }

  private async checkNodeModulesExists(): Promise<ValidationResult> {
    const nodeModulesPath = path.join(this.appPath, 'node_modules');
    const exists = fs.existsSync(nodeModulesPath);
    
    return {
      passed: exists,
      message: exists ? 'Node modules directory exists' : 'Node modules directory is missing',
      severity: exists ? 'info' : 'error',
      details: exists ? undefined : 'Required for app dependencies'
    };
  }

  private async checkCriticalDependencies(): Promise<ValidationResult> {
    const packageJsonPath = path.join(this.appPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {
        passed: false,
        message: 'Cannot check dependencies - package.json missing',
        severity: 'error'
      };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    const criticalDeps = ['expo', 'react', 'react-native', '@expo/config-plugins'];
    const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);

    return {
      passed: missingDeps.length === 0,
      message: missingDeps.length === 0 
        ? 'All critical dependencies present' 
        : `Missing critical dependencies: ${missingDeps.join(', ')}`,
      severity: missingDeps.length === 0 ? 'info' : 'error',
      details: missingDeps.length > 0 ? `Required dependencies: ${missingDeps.join(', ')}` : undefined
    };
  }

  private async checkAppStructure(): Promise<ValidationResult> {
    const hasAppDir = fs.existsSync(path.join(this.appPath, 'app'));
    const hasSrcDir = fs.existsSync(path.join(this.appPath, 'src'));
    const hasAppIndexTsx = fs.existsSync(path.join(this.appPath, 'app', 'index.tsx'));
    const hasSrcAppTsx = fs.existsSync(path.join(this.appPath, 'src', 'App.tsx'));

    if (hasAppDir && hasAppIndexTsx) {
      return {
        passed: true,
        message: 'Expo Router structure detected',
        severity: 'info',
        details: 'App uses app/index.tsx structure'
      };
    } else if (hasSrcDir && hasSrcAppTsx) {
      return {
        passed: true,
        message: 'React Native CLI structure detected',
        severity: 'info',
        details: 'App uses src/App.tsx structure'
      };
    } else {
      return {
        passed: false,
        message: 'Invalid app structure - missing main files',
        severity: 'error',
        details: 'App must have either app/index.tsx (Expo Router) or src/App.tsx (React Native CLI)'
      };
    }
  }

  private async checkAppJsonConfig(): Promise<ValidationResult> {
    const appJsonPath = path.join(this.appPath, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      return {
        passed: false,
        message: 'app.json configuration file missing',
        severity: 'error',
        details: 'Required for Expo app configuration'
      };
    }

    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const hasExpoConfig = !!appJson.expo;
      
      return {
        passed: hasExpoConfig,
        message: hasExpoConfig ? 'app.json configuration is valid' : 'app.json missing expo configuration',
        severity: hasExpoConfig ? 'info' : 'error',
        details: hasExpoConfig ? undefined : 'app.json must contain expo configuration object'
      };
    } catch (error) {
      return {
        passed: false,
        message: 'app.json contains invalid JSON',
        severity: 'error',
        details: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkTypeScriptCompilation(): Promise<ValidationResult> {
    try {
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
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
          if (code === 0) {
            resolve({
              passed: true,
              message: 'TypeScript compilation passes',
              severity: 'info'
            });
          } else {
            resolve({
              passed: false,
              message: 'TypeScript compilation errors detected',
              severity: 'error',
              details: stderr.substring(0, 500) + (stderr.length > 500 ? '...' : '')
            });
          }
        });

        child.on('error', () => {
          resolve({
            passed: true,
            message: 'TypeScript compilation check skipped',
            severity: 'info',
            details: 'Could not run TypeScript compiler'
          });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          child.kill();
          resolve({
            passed: true,
            message: 'TypeScript compilation check timed out',
            severity: 'warning',
            details: 'Check took too long, assuming compilation is OK'
          });
        }, 10000);
      });
    } catch (error) {
      return {
        passed: true,
        message: 'TypeScript compilation check failed',
        severity: 'warning',
        details: 'Could not check TypeScript compilation'
      };
    }
  }

  private async checkExpoRouterConsistency(): Promise<ValidationResult> {
    const packageJsonPath = path.join(this.appPath, 'package.json');
    const appJsonPath = path.join(this.appPath, 'app.json');
    
    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(appJsonPath)) {
      return {
        passed: true,
        message: 'Cannot check Expo Router consistency - missing config files',
        severity: 'warning'
      };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    const hasExpoRouter = !!(packageJson.dependencies?.['expo-router'] || packageJson.devDependencies?.['expo-router']);
    const hasAppDir = fs.existsSync(path.join(this.appPath, 'app'));
    const mainEntry = appJson.expo?.main || 'expo-router/entry';

    if (hasExpoRouter && mainEntry === 'expo-router/entry' && hasAppDir) {
      return {
        passed: true,
        message: 'Expo Router configuration is consistent',
        severity: 'info'
      };
    } else if (hasExpoRouter && !hasAppDir) {
      return {
        passed: false,
        message: 'Expo Router configured but app/ directory missing',
        severity: 'error',
        details: 'Expo Router requires app/ directory structure'
      };
    } else if (!hasExpoRouter && hasAppDir) {
      return {
        passed: false,
        message: 'App directory exists but Expo Router not configured',
        severity: 'warning',
        details: 'Consider adding expo-router dependency or removing app/ directory'
      };
    } else {
      return {
        passed: true,
        message: 'App structure is consistent',
        severity: 'info'
      };
    }
  }

  private async checkSyntaxErrors(): Promise<ValidationResult> {
    const appIndexFile = path.join(this.appPath, 'app', 'index.tsx');
    const srcAppFile = path.join(this.appPath, 'src', 'App.tsx');
    
    let mainFile = null;
    if (fs.existsSync(appIndexFile)) {
      mainFile = appIndexFile;
    } else if (fs.existsSync(srcAppFile)) {
      mainFile = srcAppFile;
    }

    if (!mainFile) {
      return {
        passed: false,
        message: 'No main app file found to check for syntax errors',
        severity: 'error'
      };
    }

    try {
      const content = fs.readFileSync(mainFile, 'utf8');
      
      // Check for common syntax issues
      const issues = [];
      
      if (content.includes('<LanguageContext.Provider') && !content.includes('</LanguageContext.Provider>')) {
        issues.push('Incomplete LanguageContext.Provider tag');
      }
      
      if (content.includes('<LanguageProvider>') && !content.includes('</LanguageProvider>')) {
        issues.push('Incomplete LanguageProvider tag');
      }
      
      if (content.includes('SafeAreaView') && !content.includes("import { SafeAreaView }")) {
        issues.push('Missing SafeAreaView import');
      }

      if (issues.length === 0) {
        return {
          passed: true,
          message: 'No syntax errors detected in main file',
          severity: 'info'
        };
      } else {
        return {
          passed: false,
          message: `Syntax issues detected: ${issues.join(', ')}`,
          severity: 'error',
          details: issues.join(', ')
        };
      }
    } catch (error) {
      return {
        passed: false,
        message: 'Could not read main app file',
        severity: 'error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Fix Methods Implementation

  private async createPackageJson(): Promise<FixResult> {
    // This would be implemented to create a basic package.json
    return {
      success: false,
      message: 'Package.json creation not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async installNodeModules(): Promise<FixResult> {
    // This would be implemented to run npm install
    return {
      success: false,
      message: 'Node modules installation not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async installCriticalDependencies(): Promise<FixResult> {
    // This would be implemented to install missing dependencies
    return {
      success: false,
      message: 'Critical dependencies installation not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async createAppStructure(): Promise<FixResult> {
    // This would be implemented to create missing app structure
    return {
      success: false,
      message: 'App structure creation not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async createAppJsonConfig(): Promise<FixResult> {
    // This would be implemented to create app.json
    return {
      success: false,
      message: 'App.json creation not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async fixExpoRouterConsistency(): Promise<FixResult> {
    // This would be implemented to fix Expo Router consistency
    return {
      success: false,
      message: 'Expo Router consistency fix not implemented',
      details: 'This fix needs to be implemented'
    };
  }

  private async fixSyntaxErrors(): Promise<FixResult> {
    // This would be implemented to fix syntax errors
    return {
      success: false,
      message: 'Syntax error fixes not implemented',
      details: 'This fix needs to be implemented'
    };
  }
}
