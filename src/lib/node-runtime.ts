import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

/**
 * Utility functions for handling Node.js runtime in packaged Electron apps
 * This ensures Expo CLI and other Node.js tools work in the packaged .exe
 */

/**
 * Get the path to the bundled Node.js executable
 * In development: uses system Node.js
 * In production: uses bundled Node.js from Electron
 */
export function getNodePath(): string {
  if (app.isPackaged) {
    // In packaged app, use Electron's Node.js
    return process.execPath;
  } else {
    // In development, use system Node.js
    return 'node';
  }
}

/**
 * Get the path to npm/npx executable
 * In development: uses system npm/npx
 * In production: uses bundled npm/npx
 */
export function getNpmPath(): string {
  if (app.isPackaged) {
    // Try to find npm in the bundled node_modules/.bin
    const appPath = path.dirname(app.getAppPath());
    const bundledNpm = path.join(appPath, 'node_modules', '.bin', process.platform === 'win32' ? 'npm.cmd' : 'npm');
    
    if (fs.existsSync(bundledNpm)) {
      return bundledNpm;
    }
    
    // Fallback: try to use npm from the same directory as Node.js
    const nodeDir = path.dirname(process.execPath);
    const npmPath = path.join(nodeDir, process.platform === 'win32' ? 'npm.cmd' : 'npm');
    
    if (fs.existsSync(npmPath)) {
      return npmPath;
    }
    
    // Last resort: use system npm (might not work in packaged app)
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
  } else {
    // In development, use system npm
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
  }
}

/**
 * Get the path to npx executable
 */
export function getNpxPath(): string {
  if (app.isPackaged) {
    // Try to find npx in the bundled node_modules/.bin
    const appPath = path.dirname(app.getAppPath());
    const bundledNpx = path.join(appPath, 'node_modules', '.bin', process.platform === 'win32' ? 'npx.cmd' : 'npx');
    
    if (fs.existsSync(bundledNpx)) {
      return bundledNpx;
    }
    
    // Fallback: try to use npx from the same directory as Node.js
    const nodeDir = path.dirname(process.execPath);
    const npxPath = path.join(nodeDir, process.platform === 'win32' ? 'npx.cmd' : 'npx');
    
    if (fs.existsSync(npxPath)) {
      return npxPath;
    }
    
    // Last resort: use system npx (might not work in packaged app)
    return process.platform === 'win32' ? 'npx.cmd' : 'npx';
  } else {
    // In development, use system npx
    return process.platform === 'win32' ? 'npx.cmd' : 'npx';
  }
}

/**
 * Get the path to the Expo CLI executable
 * This tries to find the bundled Expo CLI first
 */
export function getExpoPath(): string {
  if (app.isPackaged) {
    // Try to find expo in the bundled node_modules/.bin
    const appPath = path.dirname(app.getAppPath());
    const bundledExpo = path.join(appPath, 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');
    
    if (fs.existsSync(bundledExpo)) {
      return bundledExpo;
    }
    
    // Fallback: try direct expo module
    const expoModule = path.join(appPath, 'node_modules', 'expo', 'bin', 'cli.js');
    if (fs.existsSync(expoModule)) {
      return expoModule;
    }
    
    // Try @expo/cli
    const expoCli = path.join(appPath, 'node_modules', '@expo', 'cli', 'build', 'bin', 'cli');
    if (fs.existsSync(expoCli)) {
      return expoCli;
    }
  }
  
  // Fallback to npx expo
  return 'expo';
}

/**
 * Spawn a Node.js process with proper path resolution for packaged apps
 * This is a drop-in replacement for child_process.spawn when running Node.js tools
 */
export function spawnNode(
  command: string,
  args: string[] = [],
  options: any = {}
): ChildProcess {
  let executablePath: string;
  let finalArgs: string[];

  if (command === 'npx') {
    executablePath = getNpxPath();
    finalArgs = args;
  } else if (command === 'npm') {
    executablePath = getNpmPath();
    finalArgs = args;
  } else if (command === 'expo') {
    executablePath = getExpoPath();
    finalArgs = args;
  } else if (command === 'node') {
    executablePath = getNodePath();
    finalArgs = args;
  } else {
    // For other commands, try to use npx
    executablePath = getNpxPath();
    finalArgs = [command, ...args];
  }

  // Ensure proper environment for packaged apps
  const env = {
    ...process.env,
    ...options.env,
  };

  // If we're in a packaged app, ensure NODE_PATH includes our bundled modules
  if (app.isPackaged) {
    const appPath = path.dirname(app.getAppPath());
    const nodeModulesPath = path.join(appPath, 'node_modules');
    
    if (fs.existsSync(nodeModulesPath)) {
      env.NODE_PATH = nodeModulesPath + (env.NODE_PATH ? path.delimiter + env.NODE_PATH : '');
    }
  }

  return spawn(executablePath, finalArgs, {
    ...options,
    env,
    shell: true, // Always use shell for better compatibility
  });
}

/**
 * Check if all required Node.js tools are available
 * Returns an object with availability status
 */
export function checkNodeToolsAvailability(): {
  node: boolean;
  npm: boolean;
  npx: boolean;
  expo: boolean;
  paths: {
    node: string;
    npm: string;
    npx: string;
    expo: string;
  };
} {
  const nodePath = getNodePath();
  const npmPath = getNpmPath();
  const npxPath = getNpxPath();
  const expoPath = getExpoPath();

  return {
    node: fs.existsSync(nodePath) || !app.isPackaged,
    npm: fs.existsSync(npmPath) || !app.isPackaged,
    npx: fs.existsSync(npxPath) || !app.isPackaged,
    expo: fs.existsSync(expoPath) || !app.isPackaged,
    paths: {
      node: nodePath,
      npm: npmPath,
      npx: npxPath,
      expo: expoPath,
    },
  };
}
