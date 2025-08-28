/**
 * Shell Command Execution Utility
 * 
 * Provides a cross-platform interface for executing shell commands with proper error handling,
 * timeout support, and environment management.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Options for shell command execution
 */
export interface ExecOptions {
  /** Working directory for the command */
  cwd?: string;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Maximum buffer size for stdout/stderr */
  maxBuffer?: number;
  
  /** Whether to include stderr in the output */
  includeStderr?: boolean;
}

/**
 * Result of shell command execution
 */
export interface ExecResult {
  /** Standard output */
  stdout: string;
  
  /** Standard error */
  stderr: string;
  
  /** Exit code (if available) */
  exitCode?: number;
}

/**
 * Execute a shell command asynchronously
 */
export async function execAsync(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  const {
    cwd = process.cwd(),
    timeout = 30000, // 30 seconds default
    env = process.env,
    maxBuffer = 1024 * 1024 * 10, // 10MB default
    includeStderr = false
  } = options;

  try {
    const result = await execPromise(command, {
      cwd,
      timeout,
      env: { ...process.env, ...env },
      maxBuffer,
      encoding: 'utf8'
    });

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: 0
    };
  } catch (error: any) {
    // Handle different types of errors
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Command timed out after ${timeout}ms: ${command}`);
    }

    if (error.code === 'ENOENT') {
      throw new Error(`Command not found: ${command}`);
    }

    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${command}`);
    }

    // For commands that exit with non-zero code but produce output
    if (error.stdout || error.stderr) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code || 1
      };
    }

    // Re-throw the original error with additional context
    throw new Error(`Command failed: ${command} - ${error.message}`);
  }
}

/**
 * Execute a shell command and return only stdout
 */
export async function execSimple(command: string, options: ExecOptions = {}): Promise<string> {
  const result = await execAsync(command, options);
  return result.stdout.trim();
}

/**
 * Check if a command exists in the system PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const checkCommand = process.platform === 'win32' 
      ? `where ${command}` 
      : `which ${command}`;
    
    await execAsync(checkCommand, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute multiple commands in sequence
 */
export async function execSequence(
  commands: string[], 
  options: ExecOptions = {}
): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  
  for (const command of commands) {
    const result = await execAsync(command, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Execute multiple commands in parallel
 */
export async function execParallel(
  commands: string[], 
  options: ExecOptions = {}
): Promise<ExecResult[]> {
  const promises = commands.map(command => execAsync(command, options));
  return Promise.all(promises);
}

/**
 * Cross-platform command normalization
 */
export function normalizeCommand(command: string): string {
  if (process.platform === 'win32') {
    // Ensure proper escaping for Windows
    return command.replace(/'/g, '"');
  }
  return command;
}

/**
 * Get platform-specific shell
 */
export function getShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

/**
 * Execute a command with real-time output streaming
 */
export function execStream(
  command: string, 
  options: ExecOptions = {},
  onData?: (data: string, type: 'stdout' | 'stderr') => void
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = exec(command, {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      env: { ...process.env, ...options.env },
      maxBuffer: options.maxBuffer || 1024 * 1024 * 10
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: string) => {
      stdout += data;
      onData?.(data, 'stdout');
    });

    child.stderr?.on('data', (data: string) => {
      stderr += data;
      onData?.(data, 'stderr');
    });

    child.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}