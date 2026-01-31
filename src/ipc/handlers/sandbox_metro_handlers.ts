/**
 * 🏖️ Sandbox Metro Bundler - True OS-Independent Preview (FAIL-PROOF)
 * 
 * Uses Metro bundler directly (no Expo CLI) to bundle React Native code
 * for web platform using react-native-web. Serves via simple HTTP server.
 * 
 * Architecture:
 * - Metro Bundler (direct, local binary) → Bundle for web → Simple HTTP Server → Preview
 * - For Expo Router: Expo CLI wrapper → Web server → Simple HTTP Server → Preview
 * - No tunnel dependencies
 * - Auto-installs missing dependencies
 * - Health checks and error recovery
 * - True OS independence
 */

import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as net from "net";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

interface SandboxMetroStatus {
  isRunning: boolean;
  webUrl?: string;      // HTTP server URL for preview
  lanUrl?: string;      // LAN URL for QR code (optional device testing)
  port?: number;        // Metro bundler port
  httpPort?: number;    // HTTP server port
  terminalOutput?: string;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  error?: string;
  entryFile?: string;   // Entry file being bundled
  expoWebUrl?: string;  // Expo CLI web URL (extracted from output)
}

// Global state per app
const metroProcesses = new Map<number, ChildProcess>();
const httpServers = new Map<number, http.Server>();
const metroStatus = new Map<number, SandboxMetroStatus>();

/**
 * Find available port
 */
function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryPort = (port: number) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
      
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error(`No available ports found starting from ${startPort}`));
          } else {
            tryPort(port + 1);
          }
        } else {
          reject(err);
        }
      });
    };
    
    tryPort(startPort);
  });
}

/**
 * Ensure essential dependencies are installed
 */
async function ensureEssentialDependencies(appPath: string): Promise<void> {
  const packageJsonPath = path.join(appPath, 'package.json');
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  const metroPath = path.join(nodeModulesPath, 'metro');
  const rnWebPath = path.join(nodeModulesPath, 'react-native-web');
  const reactPath = path.join(nodeModulesPath, 'react');
  const reactDomPath = path.join(nodeModulesPath, 'react-dom');
  const expoPath = path.join(nodeModulesPath, 'expo');
  
  const missing: string[] = [];
  if (!fs.existsSync(metroPath)) missing.push('metro@^0.80.0');
  if (!fs.existsSync(rnWebPath)) missing.push('react-native-web@~0.19.13');
  if (!fs.existsSync(reactPath)) missing.push('react@^18.2.0');
  if (!fs.existsSync(reactDomPath)) missing.push('react-dom@^18.2.0');
  if (!fs.existsSync(expoPath)) {
    const expoMetroConfigPath = path.join(nodeModulesPath, 'expo', 'metro-config');
    if (!fs.existsSync(expoMetroConfigPath)) {
      missing.push('expo@~54.0.0');
    }
  }
  
  if (missing.length === 0) {
    log.log("✅ All essential dependencies are installed");
    return;
  }
  
  log.log(`📦 Installing missing dependencies: ${missing.join(', ')}`);
  
  try {
    const { runPackageManagerCommand } = await import("../../lib/hermetic-runtime");
    const installProcess = await runPackageManagerCommand('add', missing, appPath, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    await new Promise<void>((resolve) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          log.log("✅ Dependencies installed successfully");
        } else {
          log.warn("⚠️ Dependency installation completed with warnings");
        }
        resolve();
      });
      
      installProcess.on('error', (err) => {
        log.warn("⚠️ Dependency installation error:", err);
        resolve();
      });
    });
  } catch (error) {
    log.warn("⚠️ Hermetic runtime not available, using npm fallback");
    const { spawn } = require('child_process');
    await new Promise<void>((resolve) => {
      const installProcess = spawn('npm', ['install', ...missing, '--save'], {
        cwd: appPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          log.log("✅ Dependencies installed via npm");
        } else {
          log.warn("⚠️ npm install failed, continuing anyway");
        }
        resolve();
      });
      
      installProcess.on('error', (err) => {
        log.warn("⚠️ npm install error:", err);
        resolve();
      });
    });
  }
}

/**
 * Create Metro config for web bundling
 */
function ensureMetroConfig(appPath: string): void {
  const metroConfigPath = path.join(appPath, 'metro.config.js');
  const expoMetroConfigPath = path.join(appPath, 'node_modules', 'expo', 'metro-config');
  const hasExpo = fs.existsSync(expoMetroConfigPath);
  
  if (fs.existsSync(metroConfigPath)) {
    try {
      const existingConfig = fs.readFileSync(metroConfigPath, 'utf8');
      if (existingConfig.includes("platforms") && existingConfig.includes("web")) {
        log.log("✅ Metro config already has web support");
        return;
      }
    } catch (e) {
      log.warn("Could not read existing Metro config:", e);
    }
  }
  
  log.log(`📦 Creating/updating Metro config for web bundling (Expo: ${hasExpo ? 'available' : 'not available'})...`);
  
  let metroConfig: string;
  
  if (hasExpo) {
    metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.platforms) {
  config.resolver.platforms = ['ios', 'android', 'native', 'web'];
} else if (!config.resolver.platforms.includes('web')) {
  config.resolver.platforms.push('web');
}

config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
`;
  } else {
    metroConfig = `const { getDefaultConfig } = require('metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native') {
    try {
      return {
        filePath: require.resolve('react-native-web'),
        type: 'sourceFile',
      };
    } catch (e) {
      if (defaultResolver) {
        return defaultResolver(context, moduleName, platform);
      }
    }
  }
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  throw new Error('Cannot resolve module: ' + moduleName);
};

module.exports = config;
`;
  }
  
  fs.writeFileSync(metroConfigPath, metroConfig);
  log.log("✅ Metro config created/updated");
}

/**
 * Find entry file for the app
 */
function findEntryFile(appPath: string): string {
  const packageJsonPath = path.join(appPath, 'package.json');
  let entryFile = 'index.js';
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      entryFile = packageJson.main || 'index.js';
      log.log(`📋 Found entry file in package.json: ${entryFile}`);
      
      if (entryFile === 'expo-router/entry' || entryFile.startsWith('expo-router/')) {
        log.log(`✅ Detected Expo Router entry: ${entryFile}`);
        return entryFile;
      }
    } catch (e) {
      log.warn("Could not read package.json:", e);
    }
  }
  
  const possibleEntries = [
    entryFile,
    'index.js',
    'index.ts',
    'index.tsx',
    'App.js',
    'App.tsx',
    'app/index.js',
    'src/index.js',
    'src/App.js'
  ];
  
  for (const entry of possibleEntries) {
    if (entry.includes('/') && !entry.startsWith('./') && !entry.startsWith('../')) {
      if (entry.startsWith('expo-router/')) {
        log.log(`✅ Using Expo Router virtual entry: ${entry}`);
        return entry;
      }
      continue;
    }
    
    const entryPath = path.join(appPath, entry);
    if (fs.existsSync(entryPath)) {
      log.log(`✅ Found entry file: ${entry}`);
      return entry;
    }
  }
  
  log.warn(`⚠️ Entry file not found, using default: ${entryFile}`);
  return entryFile;
}

/**
 * Strip ANSI color codes from string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

/**
 * Extract web URL from Expo CLI output
 */
function extractExpoWebUrl(output: string): string | null {
  // Strip ANSI codes first for reliable matching
  const cleanOutput = stripAnsi(output);
  
  // Expo CLI with --web outputs patterns like:
  // "Web is waiting on http://localhost:8081"
  // "Local: http://localhost:8081"
  // "› Web is waiting on http://localhost:8081"
  // "› Local: http://localhost:8084"
  const patterns = [
    /Web\s+is\s+waiting\s+on\s+(https?:\/\/[^\s\x00-\x1F]+)/i,
    /Local:\s+(https?:\/\/[^\s\x00-\x1F]+)/i,
    /Web:\s+(https?:\/\/[^\s\x00-\x1F]+)/i,
    /(?:Local|Web)\s+server:\s+(https?:\/\/[^\s\x00-\x1F]+)/i,
    // Also match just the URL pattern in case formatting differs
    /(https?:\/\/localhost:\d+)/,
    /(https?:\/\/127\.0\.0\.1:\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanOutput.match(pattern);
    if (match && match[1]) {
      // Clean up any trailing characters
      const url = match[1].replace(/[,\s\x00-\x1F]+$/, '');
      log.log(`🔍 Extracted URL "${url}" from pattern: ${pattern}`);
      return url;
    }
  }
  
  return null;
}

/**
 * Create HTML entry point for web preview (plain Metro apps only)
 * Expo Router apps use Expo's web server directly, so this is not used for them.
 */
function createWebEntryPoint(appPath: string, metroPort: number, entryFile: string): string {
  const webDir = path.join(appPath, '.sandbox-web');
  if (!fs.existsSync(webDir)) {
    fs.mkdirSync(webDir, { recursive: true });
  }
  
  const htmlPath = path.join(webDir, 'index.html');
  
  // Determine bundle path from entry file
  let bundlePath: string;
  
  if (entryFile.includes('/') && !entryFile.startsWith('./') && !entryFile.startsWith('../')) {
    bundlePath = entryFile + '.bundle';
  } else {
    let entryRelative = entryFile.replace(/\.(js|ts|jsx|tsx)$/, '');
    if (!entryRelative.startsWith('./')) {
      entryRelative = './' + entryRelative;
    }
    bundlePath = entryRelative + '.bundle';
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>App Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100vw; height: 100vh; }
    .loading { display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; color: #666; }
    .loading-spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error { color: #e74c3c; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <div class="loading-spinner"></div>
      <h2>Loading Preview...</h2>
      <p>Bundling your app...</p>
    </div>
  </div>
  <script>
    (function() {
      const root = document.getElementById('root');
      let retryCount = 0;
      const maxRetries = 5;
      const bundleUrl = 'http://localhost:${metroPort}/${bundlePath}?platform=web&dev=true&hot=false&inlineSourceMap=true';
      
      function loadBundle() {
        const script = document.createElement('script');
        script.src = bundleUrl;
        script.async = true;
        
        script.onload = function() {
          console.log('[Sandbox Metro] Bundle loaded successfully');
        };
        
        script.onerror = function() {
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(loadBundle, 2000 * retryCount);
          } else {
            root.innerHTML = '<div class="loading error"><h2>Failed to Load Preview</h2><p>Metro bundler may not be running.</p><p><strong>URL:</strong> ' + bundleUrl + '</p></div>';
          }
        };
        
        document.head.appendChild(script);
      }
      
      setTimeout(loadBundle, 2000);
    })();
  </script>
</body>
</html>`;
  
  fs.writeFileSync(htmlPath, html);
  log.log(`✅ Created HTML entry point at ${htmlPath}`);
  return htmlPath;
}

/**
 * Start Metro bundler directly or via Expo CLI
 */
async function startMetroBundler(appId: number, appPath: string, port: number): Promise<ChildProcess> {
  log.log(`🚀 Starting Metro bundler for app ${appId} on port ${port}`);
  
  await ensureEssentialDependencies(appPath);
  ensureMetroConfig(appPath);
  
  const entryFile = findEntryFile(appPath);
  const isExpoRouterApp = entryFile.includes('expo-router/');
  
  let metroCommand: string;
  let metroArgs: string[];
  
  if (isExpoRouterApp) {
    log.log(`📦 Detected Expo Router app - using Expo CLI wrapper`);
    metroCommand = 'npx';
    metroArgs = [
      'expo',
      'start',
      '--port', port.toString(),
      '--web',
    ];
  } else {
    const metroBinPath = path.join(appPath, 'node_modules', '.bin', process.platform === 'win32' ? 'metro.cmd' : 'metro');
    metroCommand = fs.existsSync(metroBinPath) ? metroBinPath : 'npx';
    metroArgs = fs.existsSync(metroBinPath) 
      ? ['start', '--port', port.toString(), '--host', '0.0.0.0']
      : ['metro', 'start', '--port', port.toString(), '--host', '0.0.0.0'];
  }
  
  log.log(`🚀 Starting: ${metroCommand} ${metroArgs.join(' ')}`);
  
  const metroProcess = spawn(metroCommand, metroArgs, {
    cwd: appPath,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      RCT_METRO_PORT: port.toString(),
      REACT_NATIVE_PACKAGER_HOSTNAME: '0.0.0.0',
      EXPO_PUBLIC_USE_FAST_REFRESH: 'true',
      NODE_PATH: path.join(appPath, 'node_modules'),
      FORCE_COLOR: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_NO_UPDATE_CHECK: '1',
      BROWSER: 'none', // Prevent auto-opening browser
    }
  });
  
  log.log(`🚀 Process spawned with PID: ${metroProcess.pid}`);
  
  metroProcesses.set(appId, metroProcess);
  
  const status = metroStatus.get(appId);
  if (status) {
    status.entryFile = entryFile;
    metroStatus.set(appId, status);
  }
  
  // Helper to process output from both stdout and stderr
  const processOutput = (output: string, source: 'stdout' | 'stderr') => {
    const status = metroStatus.get(appId);
    if (!status) return;
    
    if (!status.terminalOutput) status.terminalOutput = '';
    status.terminalOutput += output;
    
    // Log output
    const lines = output.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (source === 'stdout') {
        log.log(`[Metro ${appId} stdout] ${line}`);
      } else {
        log.log(`[Metro ${appId} stderr] ${line}`);
      }
    });
    
    // Extract Expo web URL from cumulative output (Expo outputs URL to both streams)
    if (isExpoRouterApp && !status.expoWebUrl) {
      const webUrl = extractExpoWebUrl(status.terminalOutput);
      if (webUrl) {
        status.expoWebUrl = webUrl;
        log.log(`✅ Extracted Expo web URL from ${source}: ${webUrl}`);
        // Also mark as ready once we have the URL
        status.buildStatus = 'success';
      }
    }
    
    // Detect ready state - ONLY when server is actually listening
    // Do NOT trigger on "Starting..." messages, only on "Waiting on" / "ready" messages
    const cleanOutput = stripAnsi(output);
    const isServerListening = 
        cleanOutput.includes('Waiting on http://') ||           // Expo's "Waiting on http://localhost:8081"
        cleanOutput.includes('Metro waiting on') ||             // Metro's ready message
        cleanOutput.includes('Web is waiting on') ||            // Web ready message
        /Waiting\s+on\s+https?:/i.test(cleanOutput);            // Generic waiting pattern
    
    if (isServerListening && status.buildStatus !== 'success') {
      status.buildStatus = 'success';
      log.log(`✅ Metro/Expo server ready for app ${appId} (detected from: ${source})`);
    }
    
    // Check for errors (but don't override success)
    if (status.buildStatus !== 'success') {
      if (cleanOutput.includes('Error') || cleanOutput.includes('Failed') || cleanOutput.includes('Cannot find module')) {
        status.buildStatus = 'error';
        status.error = cleanOutput.slice(-500);
        log.error(`❌ Metro error: ${cleanOutput.slice(-500)}`);
      }
    }
    
    metroStatus.set(appId, status);
  };
  
  // Handle output - Parse Expo CLI output to extract web URL
  metroProcess.stdout?.on('data', (data: Buffer) => {
    processOutput(data.toString(), 'stdout');
  });
  
  metroProcess.stderr?.on('data', (data: Buffer) => {
    processOutput(data.toString(), 'stderr');
  });
  
  metroProcess.on('exit', (code) => {
    log.log(`Metro/Expo exited for app ${appId} with code ${code}`);
    metroProcesses.delete(appId);
    
    const status = metroStatus.get(appId);
    if (status) {
      status.isRunning = false;
      metroStatus.set(appId, status);
    }
  });
  
  metroProcess.on('error', (error) => {
    log.error(`Metro process error for app ${appId}:`, error);
    const status = metroStatus.get(appId);
    if (status) {
      status.isRunning = false;
      status.buildStatus = 'error';
      status.error = error.message;
      metroStatus.set(appId, status);
    }
  });
  
  return metroProcess;
}

/**
 * Start HTTP server to serve preview (for plain Metro apps only)
 * Expo Router apps use Expo's web server directly and don't need this.
 */
async function startHttpServer(appId: number, appPath: string, metroPort: number, entryFile: string): Promise<{ server: http.Server; port: number }> {
  const httpPort = await findAvailablePort(9000);
  
  log.log(`🌐 Starting HTTP server for app ${appId} on port ${httpPort}`);
  
  const htmlPath = createWebEntryPoint(appPath, metroPort, entryFile);
  
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        log.error('Failed to read HTML file:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to load preview');
      }
      return;
    }
    
    // Proxy bundle requests to Metro/Expo
    if (url.pathname.endsWith('.bundle') || url.pathname.match(/\.(js|jsx|ts|tsx)$/)) {
      const metroUrl = `http://localhost:${metroPort}${url.pathname}${url.search}`;
      
      const proxyReq = http.get(metroUrl, (proxyRes) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (err) => {
        log.error(`Proxy error:`, err);
        res.writeHead(500, { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Proxy error: ' + err.message);
      });
      
      proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        res.writeHead(504, { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        res.end('Request timeout');
      });
      
      return;
    }
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
  
  return new Promise((resolve, reject) => {
    server.listen(httpPort, '0.0.0.0', () => {
      log.log(`✅ HTTP server started on port ${httpPort}`);
      httpServers.set(appId, server);
      resolve({ server, port: httpPort });
    });
    
    server.on('error', (err) => {
      log.error(`HTTP server error:`, err);
      reject(err);
    });
  });
}

/**
 * Get LAN IP address
 */
function getLocalIP(): string {
  const os = require('os');
  const nets = os.networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (!net) continue;
    
    for (const n of net) {
      if (n.family === 'IPv4' && !n.internal) {
        return n.address;
      }
    }
  }
  
  return 'localhost';
}

export function registerSandboxMetroHandlers() {
  ipcMain.handle("sandbox-metro:start", async (_, params: { appId: number }) => {
    try {
      const { appId } = params;
      
      await stopSandboxMetro(appId);
      
      const appData = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData[0]) {
        throw new Error("App not found");
      }
      
      const appPath = getDyadAppPath(appData[0].path);
      log.log(`🏖️ Starting sandbox Metro for app ${appId} at ${appPath}`);
      
      const metroPort = await findAvailablePort(8081);
      const entryFile = findEntryFile(appPath);
      const isExpoRouterApp = entryFile.includes('expo-router/');
      
      const status: SandboxMetroStatus = {
        isRunning: false,
        port: metroPort,
        buildStatus: 'building',
        terminalOutput: '',
        entryFile: entryFile
      };
      metroStatus.set(appId, status);
      
      const metroProcess = await startMetroBundler(appId, appPath, metroPort);
      status.isRunning = true;
      metroStatus.set(appId, status);
      
      // Wait for Metro/Expo to be ready - wait up to 60 seconds for Expo CLI
      const maxWaitTime = isExpoRouterApp ? 60000 : 45000;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          log.warn(`Metro/Expo ready check timeout after ${maxWaitTime/1000}s`);
          resolve();
        }, maxWaitTime);
        
        const checkReady = setInterval(() => {
          const currentStatus = metroStatus.get(appId);
          if (currentStatus?.buildStatus === 'success') {
            clearInterval(checkReady);
            clearTimeout(timeout);
            log.log(`✅ Metro/Expo confirmed ready`);
            resolve();
          } else if (currentStatus?.buildStatus === 'error') {
            clearInterval(checkReady);
            clearTimeout(timeout);
            log.warn(`⚠️ Metro/Expo reported error`);
            resolve();
          }
        }, 1000);
      });
      
      // Get final status
      const finalStatus = metroStatus.get(appId)!;
      
      // For Expo Router apps: Return Expo's web URL directly (avoids CORS issues)
      // For plain Metro apps: Start our HTTP server to serve the bundle loader HTML
      if (isExpoRouterApp) {
        // Expo Router: Use Expo's web server directly
        const expoWebUrl = finalStatus.expoWebUrl || `http://localhost:${metroPort}`;
        log.log(`✅ Expo Router app - using Expo web URL directly: ${expoWebUrl}`);
        
        finalStatus.webUrl = expoWebUrl;
        finalStatus.lanUrl = `http://${getLocalIP()}:${metroPort}`;
        finalStatus.httpPort = metroPort; // No separate HTTP server
        metroStatus.set(appId, finalStatus);
        
        log.log(`✅ Sandbox Metro (Expo Router) started: webUrl=${finalStatus.webUrl}`);
        
        return {
          success: true,
          isRunning: true,
          webUrl: finalStatus.webUrl,
          lanUrl: finalStatus.lanUrl,
          port: metroPort,
          httpPort: metroPort
        };
      } else {
        // Plain Metro: Use our HTTP server to serve bundle loader HTML
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { port: httpPort } = await startHttpServer(appId, appPath, metroPort, entryFile);
        
        finalStatus.webUrl = `http://localhost:${httpPort}`;
        finalStatus.lanUrl = `http://${getLocalIP()}:${httpPort}`;
        finalStatus.httpPort = httpPort;
        metroStatus.set(appId, finalStatus);
        
        log.log(`✅ Sandbox Metro started: webUrl=${finalStatus.webUrl}`);
        
        return {
          success: true,
          isRunning: true,
          webUrl: finalStatus.webUrl,
          lanUrl: finalStatus.lanUrl,
          port: metroPort,
          httpPort: httpPort
        };
      }
    } catch (error: any) {
      log.error("Failed to start sandbox Metro:", error);
      return {
        success: false,
        error: error.message,
        isRunning: false
      };
    }
  });
  
  async function stopSandboxMetro(appId: number): Promise<void> {
    const metroProcess = metroProcesses.get(appId);
    if (metroProcess) {
      log.log(`🛑 Stopping Metro bundler for app ${appId}`);
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", metroProcess.pid!.toString(), "/f", "/t"], { stdio: 'ignore' });
        } else {
          metroProcess.kill("SIGTERM");
        }
      } catch (e) {
        log.warn("Error stopping Metro process:", e);
      }
      metroProcesses.delete(appId);
    }
    
    const httpServer = httpServers.get(appId);
    if (httpServer) {
      log.log(`🛑 Stopping HTTP server for app ${appId}`);
      try {
        httpServer.close();
      } catch (e) {
        log.warn("Error stopping HTTP server:", e);
      }
      httpServers.delete(appId);
    }
    
    metroStatus.delete(appId);
  }
  
  ipcMain.handle("sandbox-metro:stop", async (_, params: { appId: number }) => {
    try {
      await stopSandboxMetro(params.appId);
      return { success: true };
    } catch (error: any) {
      log.error("Failed to stop sandbox Metro:", error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle("sandbox-metro:status", async (_, params: { appId: number }) => {
    const status = metroStatus.get(params.appId);
    return status || {
      isRunning: false,
      buildStatus: 'idle'
    };
  });
}
