/**
 * 🔍 REAL-TIME LINTING MANAGER
 * 
 * Inspired by Quests' real-time linting
 * Provides live code quality feedback and error detection
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface LintError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  fix?: string;
}

export interface LintResult {
  file: string;
  errors: LintError[];
  warnings: LintError[];
  info: LintError[];
  score: number; // 0-100
  timestamp: number;
}

export interface LintingConfig {
  enableRealTime: boolean;
  enableAutoFix: boolean;
  enableTypeScript: boolean;
  enableESLint: boolean;
  enablePrettier: boolean;
  watchPatterns: string[];
  ignorePatterns: string[];
  debounceMs: number;
}

/**
 * RealTimeLintingManager - Live code quality feedback inspired by Quests
 * 
 * Provides:
 * - Real-time error detection
 * - Automatic code fixing
 * - TypeScript checking
 * - ESLint integration
 * - Prettier formatting
 */
export class RealTimeLintingManager extends EventEmitter {
  private static instance: RealTimeLintingManager;
  
  private config: LintingConfig;
  private fileWatchers = new Map<string, fs.FSWatcher>();
  private lintResults = new Map<string, LintResult>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private isLinting = new Map<string, boolean>();
  
  constructor(config: Partial<LintingConfig> = {}) {
    super();
    
    this.config = {
      enableRealTime: true,
      enableAutoFix: true,
      enableTypeScript: true,
      enableESLint: true,
      enablePrettier: true,
      watchPatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      ignorePatterns: ['node_modules/**', 'dist/**', 'build/**'],
      debounceMs: 500,
      ...config
    };
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<LintingConfig>): RealTimeLintingManager {
    if (!RealTimeLintingManager.instance) {
      RealTimeLintingManager.instance = new RealTimeLintingManager(config);
    }
    return RealTimeLintingManager.instance;
  }
  
  /**
   * Start real-time linting for an app
   */
  public async startLinting(appId: number, appPath: string): Promise<void> {
    console.log(`🔍 Starting real-time linting for app ${appId} at ${appPath}`);
    
    try {
      // Setup file watchers
      await this.setupFileWatchers(appId, appPath);
      
      // Initial lint
      await this.lintApp(appId, appPath);
      
      console.log(`✅ Real-time linting started for app ${appId}`);
      this.emit('linting:started', { appId, appPath });
      
    } catch (error) {
      console.error(`❌ Failed to start linting for app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Stop real-time linting for an app
   */
  public stopLinting(appId: number): void {
    console.log(`🛑 Stopping real-time linting for app ${appId}`);
    
    // Clear debounce timers
    const timer = this.debounceTimers.get(`app_${appId}`);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(`app_${appId}`);
    }
    
    // Close file watchers
    const watcher = this.fileWatchers.get(`app_${appId}`);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(`app_${appId}`);
    }
    
    // Clear lint results
    this.lintResults.delete(`app_${appId}`);
    this.isLinting.delete(`app_${appId}`);
    
    console.log(`✅ Real-time linting stopped for app ${appId}`);
    this.emit('linting:stopped', { appId });
  }
  
  /**
   * Get lint results for an app
   */
  public getLintResults(appId: number): LintResult[] {
    const results: LintResult[] = [];
    
    for (const [key, result] of this.lintResults.entries()) {
      if (key.startsWith(`app_${appId}_`)) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Get overall lint score for an app
   */
  public getLintScore(appId: number): number {
    const results = this.getLintResults(appId);
    if (results.length === 0) {
      return 100;
    }
    
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / results.length);
  }
  
  /**
   * Auto-fix linting issues
   */
  public async autoFix(appId: number, filePath: string): Promise<boolean> {
    console.log(`🔧 Auto-fixing linting issues for ${filePath}`);
    
    try {
      if (this.config.enablePrettier) {
        await this.runPrettier(filePath, true);
      }
      
      if (this.config.enableESLint) {
        await this.runESLint(filePath, true);
      }
      
      // Re-lint the file
      await this.lintFile(appId, filePath);
      
      console.log(`✅ Auto-fix completed for ${filePath}`);
      this.emit('linting:autofix', { appId, filePath });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Auto-fix failed for ${filePath}:`, error);
      return false;
    }
  }
  
  /**
   * Setup file watchers for an app
   */
  private async setupFileWatchers(appId: number, appPath: string): Promise<void> {
    const watcher = fs.watch(appPath, { recursive: true }, (eventType, filename) => {
      if (filename && this.shouldLintFile(filename)) {
        this.debounceLint(appId, path.join(appPath, filename));
      }
    });
    
    this.fileWatchers.set(`app_${appId}`, watcher);
  }
  
  /**
   * Debounce linting to avoid excessive processing
   */
  private debounceLint(appId: number, filePath: string): void {
    const key = `app_${appId}`;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.lintFile(appId, filePath);
      this.debounceTimers.delete(key);
    }, this.config.debounceMs);
    
    this.debounceTimers.set(key, timer);
  }
  
  /**
   * Lint an entire app
   */
  private async lintApp(appId: number, appPath: string): Promise<void> {
    console.log(`🔍 Linting app ${appId} at ${appPath}`);
    
    try {
      const files = await this.getLintableFiles(appPath);
      
      for (const file of files) {
        await this.lintFile(appId, file);
      }
      
      console.log(`✅ App ${appId} linting completed`);
      this.emit('linting:completed', { appId, appPath });
      
    } catch (error) {
      console.error(`❌ Failed to lint app ${appId}:`, error);
      throw error;
    }
  }
  
  /**
   * Lint a specific file
   */
  private async lintFile(appId: number, filePath: string): Promise<void> {
    if (this.isLinting.get(filePath)) {
      return; // Already linting
    }
    
    this.isLinting.set(filePath, true);
    
    try {
      const results: LintError[] = [];
      
      // TypeScript checking
      if (this.config.enableTypeScript) {
        const tsErrors = await this.runTypeScript(filePath);
        results.push(...tsErrors);
      }
      
      // ESLint checking
      if (this.config.enableESLint) {
        const eslintErrors = await this.runESLint(filePath, false);
        results.push(...eslintErrors);
      }
      
      // Prettier checking
      if (this.config.enablePrettier) {
        const prettierErrors = await this.runPrettier(filePath, false);
        results.push(...prettierErrors);
      }
      
      // Categorize errors
      const errors = results.filter(r => r.severity === 'error');
      const warnings = results.filter(r => r.severity === 'warning');
      const info = results.filter(r => r.severity === 'info');
      
      // Calculate score
      const score = this.calculateScore(errors, warnings, info);
      
      const result: LintResult = {
        file: filePath,
        errors,
        warnings,
        info,
        score,
        timestamp: Date.now()
      };
      
      this.lintResults.set(`app_${appId}_${filePath}`, result);
      
      this.emit('linting:file-completed', { appId, filePath, result });
      
    } catch (error) {
      console.error(`❌ Failed to lint file ${filePath}:`, error);
    } finally {
      this.isLinting.delete(filePath);
    }
  }
  
  /**
   * Run TypeScript compiler
   */
  private async runTypeScript(filePath: string): Promise<LintError[]> {
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false', filePath]);
      let output = '';
      
      tsc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tsc.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      tsc.on('close', () => {
        const errors = this.parseTypeScriptOutput(output);
        resolve(errors);
      });
      
      tsc.on('error', () => {
        resolve([]);
      });
    });
  }
  
  /**
   * Run ESLint
   */
  private async runESLint(filePath: string, fix: boolean): Promise<LintError[]> {
    return new Promise((resolve) => {
      const args = ['eslint', filePath, '--format', 'json'];
      if (fix) {
        args.push('--fix');
      }
      
      const eslint = spawn('npx', args);
      let output = '';
      
      eslint.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      eslint.on('close', () => {
        try {
          const results = JSON.parse(output);
          const errors = this.parseESLintOutput(results);
          resolve(errors);
        } catch {
          resolve([]);
        }
      });
      
      eslint.on('error', () => {
        resolve([]);
      });
    });
  }
  
  /**
   * Run Prettier
   */
  private async runPrettier(filePath: string, fix: boolean): Promise<LintError[]> {
    return new Promise((resolve) => {
      const args = ['prettier', '--check', filePath];
      if (fix) {
        args[1] = '--write';
      }
      
      const prettier = spawn('npx', args);
      let output = '';
      
      prettier.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      prettier.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      prettier.on('close', (code) => {
        if (code !== 0) {
          const errors = this.parsePrettierOutput(output);
          resolve(errors);
        } else {
          resolve([]);
        }
      });
      
      prettier.on('error', () => {
        resolve([]);
      });
    });
  }
  
  /**
   * Parse TypeScript output
   */
  private parseTypeScriptOutput(output: string): LintError[] {
    const errors: LintError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[5],
          severity: 'error',
          rule: `TS${match[4]}`
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Parse ESLint output
   */
  private parseESLintOutput(results: any[]): LintError[] {
    const errors: LintError[] = [];
    
    for (const result of results) {
      for (const message of result.messages) {
        errors.push({
          file: result.filePath,
          line: message.line,
          column: message.column,
          message: message.message,
          severity: message.severity === 2 ? 'error' : 'warning',
          rule: message.ruleId || 'unknown',
          fix: message.fix ? JSON.stringify(message.fix) : undefined
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Parse Prettier output
   */
  private parsePrettierOutput(output: string): LintError[] {
    const errors: LintError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Code style issues found')) {
        errors.push({
          file: line.split(' ')[0],
          line: 1,
          column: 1,
          message: 'Code style issues found',
          severity: 'warning',
          rule: 'prettier'
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Calculate lint score
   */
  private calculateScore(errors: LintError[], warnings: LintError[], info: LintError[]): number {
    let score = 100;
    
    // Deduct points for errors
    score -= errors.length * 10;
    
    // Deduct points for warnings
    score -= warnings.length * 5;
    
    // Deduct points for info
    score -= info.length * 1;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Check if file should be linted
   */
  private shouldLintFile(filename: string): boolean {
    const ext = path.extname(filename);
    const shouldLint = ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
    
    if (!shouldLint) {
      return false;
    }
    
    // Check ignore patterns
    for (const pattern of this.config.ignorePatterns) {
      if (filename.includes(pattern.replace('**/', ''))) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get lintable files in directory
   */
  private async getLintableFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (item !== 'node_modules' && item !== 'dist' && item !== 'build') {
              scanDir(fullPath);
            }
          } else if (this.shouldLintFile(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    };
    
    scanDir(dirPath);
    return files;
  }
  
  /**
   * Shutdown linting manager
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down RealTimeLintingManager...');
    
    // Stop all linting
    for (const [key, watcher] of this.fileWatchers.entries()) {
      watcher.close();
    }
    
    // Clear timers
    for (const [key, timer] of this.debounceTimers.entries()) {
      clearTimeout(timer);
    }
    
    this.fileWatchers.clear();
    this.debounceTimers.clear();
    this.lintResults.clear();
    this.isLinting.clear();
    
    console.log('✅ RealTimeLintingManager shutdown complete');
  }
}

/**
 * Get singleton real-time linting manager instance
 */
export function getRealTimeLintingManager(config?: Partial<LintingConfig>): RealTimeLintingManager {
  return RealTimeLintingManager.getInstance(config);
}




