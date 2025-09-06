import { ipcMain, app } from "electron";
import { spawn } from "child_process";
import os from "os";
import { startProxy } from "../utils/start_proxy_server";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

// Logger for consistent logging
const logger = {
  debug: (...args) => log.log(...args),
  warn: (...args) => log.warn(...args)
};

// URL pattern definitions for parsing Expo output
const webUrlPatterns = [
  /(?:Web|Local):\s+(https?:\/\/localhost:\d+)/i,
  /(?:Web|Local):\s+(https?:\/\/127\.0\.0\.1:\d+)/i,
  /(?:Web|Local):\s+(https?:\/\/0\.0\.0\.0:\d+)/i
];

const lanUrlPatterns = [
  /(?:LAN|Network):\s+(https?:\/\/[\d\.]+:\d+)/i,
  /(?:LAN|Network):\s+(exp:\/\/[\d\.]+:\d+)/i
];

const tunnelUrlPatterns = [
  /(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev)/i,
  /(https?:\/\/[a-zA-Z0-9-]+\.exp\.direct)/i,
  /(exp:\/\/[a-zA-Z0-9.-]+\.exp\.direct)/i,
  /(exp:\/\/[a-zA-Z0-9.-]+\.tunnels\.expo\.dev)/i
];

interface ExpoStatus {
  isRunning: boolean;
  webUrl: string;
  lanUrl: string;
  tunnelUrl: string;
  qrUrl: string;
  terminalOutput?: string;
  lastHotReload?: number; // Timestamp of last hot reload
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string; // Build progress message
}

let expoProcess: any = null;
let expoStatus: ExpoStatus = {
  isRunning: false,
  webUrl: "",
  lanUrl: "",
  tunnelUrl: "",
  qrUrl: "",
  terminalOutput: "",
  buildStatus: 'idle'
};

// Mutex to prevent multiple simultaneous starts
let isStarting = false;

// Debounce hot reload detection to prevent false positives
let lastAutoHotReload = 0;
const HOT_RELOAD_DEBOUNCE = 5000; // 5 seconds

// Export function to trigger hot reload from other handlers
export async function triggerExpoHotReload(): Promise<{ success: boolean; reason?: string }> {
  try {
    if (expoStatus.isRunning) {
      const now = Date.now();
      lastAutoHotReload = now; // Reset debounce timer
      expoStatus.lastHotReload = now;
      expoStatus.buildStatus = 'success';
      log.log('🔥 Hot reload triggered from file change (manual)');
      return { success: true };
    } else {
      return { success: false, reason: "Expo not running" };
    }
  } catch (error) {
    log.error("Failed to trigger hot reload:", error);
    return { success: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function registerExpoHandlers() {
  ipcMain.handle("expo:start", async (
    _,
    params: { appId: number; useTunnel?: boolean; native?: boolean },
  ) => {
    try {
      // Prevent multiple simultaneous starts
      if (isStarting) {
        log.warn("Expo start already in progress, ignoring duplicate request");
        return { success: false, error: "Start already in progress" };
      }
      
      isStarting = true;
      const { appId, useTunnel = true, native = true } = params;
      log.log(`🚀 Starting Expo for app ID: ${appId}, useTunnel: ${useTunnel}, native: ${native}`);

      // Always stop any existing processes first to ensure clean start
      if (expoProcess || expoStatus.isRunning) {
        log.log("Stopping any existing Expo processes first");
        try {
          if (expoProcess) {
            if (process.platform === "win32") {
              spawn("taskkill", ["/pid", expoProcess.pid!.toString(), "/f", "/t"]);
            } else {
              expoProcess.kill("SIGTERM");
            }
          }
          
          // Also kill any orphaned Expo processes
          if (process.platform === "win32") {
            spawn("taskkill", ["/F", "/IM", "node.exe", "/FI", "COMMANDLINE eq *expo*"], { stdio: 'ignore' });
          }
        } catch (e) {
          log.warn("Error stopping existing Expo process:", e);
        }
        expoProcess = null;
        expoStatus = {
          isRunning: false,
          webUrl: "",
          lanUrl: "",
          tunnelUrl: "",
          qrUrl: "",
          terminalOutput: "",
          buildStatus: 'idle'
        };
        lastAutoHotReload = 0; // Reset debounce timer on fresh start
        // Wait longer for process cleanup
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Get app data with legacy fallback
      let appData: any;
      try {
        const result = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
        appData = result[0];
      } catch (err) {
        log.warn("expo:start: falling back to legacy SELECT due to:", err);
        const row = db.$client
          .prepare(
            "SELECT id, name, path, created_at as createdAt, updated_at as updatedAt, " +
              "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
              "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
              "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
              "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
              "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ? LIMIT 1"
          )
          .get(appId) as any;
        appData = row;
        if (appData) {
          if (appData.createdAt && typeof appData.createdAt === "number") {
            appData.createdAt = new Date(appData.createdAt * 1000);
          }
          if (appData.updatedAt && typeof appData.updatedAt === "number") {
            appData.updatedAt = new Date(appData.updatedAt * 1000);
          }
          appData.displayName = undefined;
          appData.packageId = undefined;
          appData.slug = undefined;
        }
      }
      
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      log.log(`Starting Expo for app: ${appData.name} at ${appPath}`);

      // Reset status
      expoStatus = {
        isRunning: true,
        webUrl: "",
        lanUrl: "",
        tunnelUrl: "",
        qrUrl: "",
        terminalOutput: "",
        buildStatus: 'idle'
      };

      // First, check if dependencies are installed for mobile apps
      const fs = require('fs');
      const path = require('path');
      const nodeModulesPath = path.join(appPath, 'node_modules');
      const packageJsonPath = path.join(appPath, 'package.json');
      
      // Check if this is a mobile app by looking at package.json
      let isMobileApp = false;
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        isMobileApp = packageJson.dependencies && (
          packageJson.dependencies.expo || 
          packageJson.dependencies['react-native'] || 
          packageJson.dependencies['expo-router']
        );

      } catch (error) {
        log.warn("Could not read package.json:", error);
      }

      // 🚀 PERFORMANCE OPTIMIZED: Fast dependency management for mobile apps
      if (isMobileApp) {
        log.log("🎯 Mobile app detected, optimizing dependencies...");
        
        // Use smart Expo dependency management
        const { ExpoDependencyManager } = await import("../../lib/expo/ExpoDependencyManager");
        
        try {
          // Smart dependency management with conflict resolution
          const depManager = new ExpoDependencyManager(appPath);
          const depsReady = await depManager.ensureEssentialDependencies();
          
          if (!depsReady) {
            log.log("📦 Installing core dependencies with optimized package manager...");
            
            // Use optimized package manager with performance flags
            const installProcess = await runPackageManagerCommand("install", [], appPath, {
              stdio: ['pipe', 'pipe', 'pipe'],
              env: {
                ...process.env,
                CI: "1", // Prevent interactive prompts
                EXPO_NO_DOCTOR: "1",
                EXPO_NO_UPDATE_CHECK: "1",
                NPM_CONFIG_AUDIT: "false", // Skip audit for speed
                NPM_CONFIG_FUND: "false"   // Skip funding messages
              }
            });

            await new Promise((resolve, reject) => {
              installProcess.on('close', (code) => {
                if (code === 0) {
                  log.log("✅ Dependencies installed successfully with optimizations");
                  resolve(true);
                } else {
                  log.error(`📦 Package manager failed with code ${code}`);
                  reject(new Error(`Failed to install dependencies: exit code ${code}`));
                }
              });

              installProcess.on('error', (error) => {
                log.error("📦 Package manager error:", error);
                reject(error);
              });

              installProcess.stdout?.on('data', (data) => {
                log.log("📦 install stdout:", data.toString());
              });

              installProcess.stderr?.on('data', (data) => {
                log.warn("📦 install stderr:", data.toString());
              });
            });
          } else {
            log.log("✅ All essential dependencies already present, skipping install");
          }
        } catch (error) {
          log.error("❌ Optimized dependency management failed, falling back to npm:", error);
          
          // Fallback to basic npm install with legacy peer deps
          const fallbackProcess = spawn("npm", ["install", "--legacy-peer-deps", "--prefer-offline", "--no-audit"], {
            cwd: appPath,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          await new Promise((resolve, reject) => {
            fallbackProcess.on('close', (code) => {
              if (code === 0) {
                log.log("✅ Fallback npm install completed");
                resolve(true);
              } else {
                reject(new Error(`Fallback npm install failed: ${code}`));
              }
            });
            fallbackProcess.on('error', reject);
          });
        }

        // Also ensure Expo SDK is installed if missing
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (!packageJson.dependencies?.expo) {
            log.log("Installing missing Expo SDK using smart installer...");
            const depManager = new ExpoDependencyManager(appPath);
            const success = await depManager.installDependencies(['expo']);
            if (success) {
              log.log("✅ Expo SDK installed successfully");
            } else {
              log.warn("⚠️ Expo SDK install completed with warnings");
            }
          }
        } catch (err) {
          log.warn("Could not check/install Expo SDK:", err);
        }
      }

      // Ensure TypeScript web support when project uses TS
      try {
        const tsconfigExists = fs.existsSync(path.join(appPath, 'tsconfig.json')) || fs.existsSync(path.join(appPath, 'tsconfig.app.json'));
        if (tsconfigExists) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const hasTypesReact = Boolean(pkg.devDependencies?.['@types/react'] || pkg.dependencies?.['@types/react']);
          if (!hasTypesReact) {
            log.log('Installing @types/react for TypeScript web support');
            
            // 🚀 PERFORMANCE: Use hermetic package manager strategy
            const { runPackageManagerCommand } = await import("../../lib/hermetic-runtime");
            
            await new Promise(async (resolve, reject) => {
              const p = await runPackageManagerCommand('add', ['-D', '@types/react@~19.0.10'], appPath, {
                stdio: ['pipe','pipe','pipe']
              });
              p.on('close', (code: number) => {
                if (code === 0) resolve(true);
                else reject(new Error(`install @types/react exited with ${code}`));
              });
              p.on('error', reject);
            });
          }
        }
      } catch (e) {
        log.warn('Failed ensuring TS support (@types/react):', e);
      }

      // Start Expo dev server with multiple fallback strategies (prefer modern CLI first)
      const expoCommands = [
        ["npx", "expo"],  // New Expo CLI (preferred)
        ["npx", "@expo/cli"],
        ["yarn", "expo"],
        // Legacy expo-cli removed - causes version conflicts
      ];

      // 🚀 CRITICAL FIX: Auto-detect available port to prevent conflicts
      const net = require('net');
      let availablePort = 8081;
      
      // Simple port availability check
      const isPortAvailable = (port: number): Promise<boolean> => {
        return new Promise((resolve) => {
          const server = net.createServer();
          server.listen(port, () => {
            server.close(() => resolve(true));
          });
          server.on('error', () => resolve(false));
        });
      };

      // Enhanced port scanning with wider range and better logging
      const portRange = { start: 8081, end: 8200 }; // Expanded range for busy machines
      
      while (!(await isPortAvailable(availablePort)) && availablePort < portRange.end) {
        log.log(`🔍 Port ${availablePort} is busy, trying next port...`);
        availablePort++;
      }
      
      if (availablePort >= portRange.end) {
        throw new Error(`No available ports found in range ${portRange.start}-${portRange.end}. Please close other development servers or restart your machine.`);
      }

      log.log(`✅ Auto-detected available port: ${availablePort} for Expo dev server (scanned ${availablePort - portRange.start + 1} ports)`);
      
      // 🚀 CRITICAL FIX: Verify @expo/ngrok is installed for tunnel support
      if (useTunnel) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const hasNgrok = packageJson.dependencies?.["@expo/ngrok"] || packageJson.devDependencies?.["@expo/ngrok"];
          
          if (!hasNgrok) {
            log.warn("⚠️ @expo/ngrok not found, installing to prevent interactive prompts...");
            
            // Install @expo/ngrok non-interactively
            const ngrokInstallProcess = spawn("npm", ["install", "@expo/ngrok", "--silent"], {
              cwd: appPath,
              shell: true,
              stdio: ["ignore", "pipe", "pipe"],
              env: {
                ...process.env,
                CI: "1", // Prevent interactive prompts
                EXPO_NO_DOCTOR: "1",
                EXPO_NO_UPDATE_CHECK: "1",
              },
            });
            
            await new Promise<void>((resolve, reject) => {
              // Add timeout to prevent hanging
              const timeout = setTimeout(() => {
                ngrokInstallProcess.kill();
                log.warn("⚠️ @expo/ngrok installation timeout (30s), continuing without tunnel support");
                resolve(); // Don't reject, just continue without tunnel
              }, 30000);
              
              ngrokInstallProcess.stdout?.on("data", (data) => {
                logger.debug(`[npm install @expo/ngrok] ${data.toString()}`);
              });
              ngrokInstallProcess.stderr?.on("data", (data) => {
                logger.warn(`[npm install @expo/ngrok:err] ${data.toString()}`);
              });
              ngrokInstallProcess.on("error", (error) => {
                clearTimeout(timeout);
                log.warn("⚠️ @expo/ngrok installation failed, continuing without tunnel support:", error);
                resolve(); // Don't reject, just continue without tunnel
              });
              ngrokInstallProcess.on("close", (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                  resolve();
                } else {
                  log.warn(`⚠️ @expo/ngrok installation failed with code ${code}, continuing without tunnel support`);
                  resolve(); // Don't reject, just continue without tunnel
                }
              });
            });
            
            log.log("✅ Successfully installed @expo/ngrok for tunnel support");
          } else {
            log.log("✅ @expo/ngrok already available for tunnel support");
          }
        } catch (err) {
          log.warn("⚠️ Could not verify/install @expo/ngrok:", err);
        }
      }

      // Build args to allow both web preview and tunnel concurrently (RORK sequence)
      // Expo supports starting the dev server once; the web UI and tunnel coexist.
      // We avoid forcing web-only so native/tunnel URLs are emitted, while web still serves at localhost.
      // Run web preview alongside native/tunnel (matches RORK sequence)
      // 🚀 CRITICAL FIX: Specify detected port to prevent conflicts and prompts
      const expoArgs: string[] = [
        "start",
        "--clear", // --reset-cache is not supported in new Expo CLI, --clear is sufficient
        "--port", availablePort.toString(), // Use our auto-detected available port
        ...(useTunnel ? ["--tunnel"] : [])
      ];

      let expoStarted = false;
      for (const [command, subcommand] of expoCommands) {
        try {
          log.log(`Trying to start Expo with: ${command} ${subcommand} ${expoArgs.join(' ')}`);

          expoProcess = spawn(command, [subcommand, ...expoArgs], {
            cwd: appPath,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              CI: '1', // Enable CI mode to auto-accept port changes
              EXPO_NO_DOCTOR: '1', // Skip health checks that might fail
              EXPO_NO_UPDATE_CHECK: '1', // Skip update checks
              EXPO_NO_TELEMETRY: '1', // Disable telemetry
              NODE_ENV: 'development', // Ensure development mode
              FORCE_COLOR: '0', // Disable colors for cleaner output
              // 🚀 CRITICAL FIX: Force port via environment variables to prevent prompts
              EXPO_FORCE_PORT: availablePort.toString(),
              RCT_METRO_PORT: availablePort.toString(),
              METRO_PORT: availablePort.toString(),
            }
          });

          // Wait a bit to see if it starts successfully
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          if (expoProcess && !expoProcess.killed) {
            log.log(`Successfully started Expo with: ${command} ${subcommand}`);
            expoStarted = true;
            break;
          }
        } catch (error) {
          log.warn(`Failed to start Expo with ${command} ${subcommand}:`, error);
          continue;
        }
      }

      if (!expoStarted) {
        throw new Error("Failed to start Expo server with any available command");
      }

      log.log(`Expo process started with PID: ${expoProcess.pid}`);

      // Store detected port for fallback use
      let detectedPort: string | null = null;

      // Utility to get a LAN IP address for fallbacks
      function getLocalIP(): string {
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          const net = nets[name];
          if (!net) continue;
          for (const n of net) {
            if (n.family === "IPv4" && !n.internal) {
              return n.address;
            }
          }
        }
        return "localhost";
      }

      // Keep a single proxy worker for expo web server (web mode only)
      let proxyWorker: any = null;

      // Simple approach: Look for QR code, then auto-press 'w' for web
      let hasFoundQR = false;
      let hasStartedWeb = false;
      
      // Handle process output
      expoProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        log.log("Expo stdout:", output);
        
        // Append to terminal output for debugging
        if (!expoStatus.terminalOutput) expoStatus.terminalOutput = "";
        expoStatus.terminalOutput += output;

        // 🎯 STEP 1: Look for QR code URL first (this is what mobile devices need)
        if (!hasFoundQR) {
          // Look for exp:// URLs (native QR codes)
          const expMatch = output.match(/(exp:\/\/[^\s\n\r]+)/i);
          if (expMatch) {
            expoStatus.qrUrl = expMatch[1];
            hasFoundQR = true;
            log.log(`📱 QR Code URL found: ${expMatch[1]}`);
            
            // 🎯 STEP 2: Auto-press 'w' to start web server after QR is found
            if (!hasStartedWeb && expoProcess && expoProcess.stdin) {
              setTimeout(() => {
                log.log(`🌐 Auto-pressing 'w' to start web server...`);
                expoProcess.stdin?.write('w\n');
                hasStartedWeb = true;
              }, 3000); // Wait 3 seconds for Expo to fully initialize
            }
          }
          
          // Fallback: Look for LAN URLs if no exp:// found
          const lanMatch = output.match(/(?:LAN|Network):\s+(https?:\/\/[\d\.]+:\d+)/i);
          if (lanMatch && !expoStatus.qrUrl) {
            expoStatus.qrUrl = lanMatch[1];
            expoStatus.lanUrl = lanMatch[1];
            hasFoundQR = true;
            log.log(`📱 QR Code URL (LAN fallback): ${lanMatch[1]}`);
          }
        }

        // 🎯 STEP 3: Capture web URL after pressing 'w'
        const webMatch = output.match(/(?:Local|Web):\s+(https?:\/\/localhost:\d+)/i);
        if (webMatch && hasStartedWeb) {
          expoStatus.webUrl = webMatch[1];
          log.log(`🌐 Web URL captured: ${webMatch[1]}`);
        }

        // 🎯 STEP 4: Also capture tunnel URLs if tunnel mode is enabled
        if (useTunnel && !expoStatus.tunnelUrl) {
          const tunnelMatch = output.match(/(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev)/i) ||
                             output.match(/(https?:\/\/[a-zA-Z0-9-]+\.exp\.direct)/i) ||
                             output.match(/(exp:\/\/[a-zA-Z0-9.-]+\.exp\.direct)/i);
          if (tunnelMatch) {
            expoStatus.tunnelUrl = tunnelMatch[1];
            // Prefer tunnel URL for QR code if tunnel is enabled
            expoStatus.qrUrl = tunnelMatch[1];
            log.log(`🚇 Tunnel URL found: ${tunnelMatch[1]}`);
          }
        }

        // Store detected web URL but don't expose it until Metro is ready
        let detectedWebUrl: string | null = null;
        for (const pattern of webUrlPatterns) {
          const match = output.match(pattern);
          if (!native && match && match[1]) {
            detectedWebUrl = match[1];
            log.log(`Detected web URL: ${detectedWebUrl}`);
            break;
          }
        }

        // Only set webUrl when Metro is actually ready to serve content
        if (detectedWebUrl && !expoStatus.webUrl) {
          // Wait for Metro to be fully ready before exposing the URL
          if (output.includes('Metro waiting') || 
              output.includes('Logs for your project') || 
              output.includes('› Press') ||
              (output.includes('Bundled') && output.includes('ms'))) {
            expoStatus.webUrl = detectedWebUrl;
            log.log(`✅ Metro bundler is ready! Setting web URL: ${expoStatus.webUrl}`);
          } else {
            log.log(`⏳ Metro bundler detected but not ready yet: ${detectedWebUrl}`);
          }
        }

        // LAN URL for device testing (QR)
        for (const pattern of lanUrlPatterns) {
          const match = output.match(pattern);
          if (match && match[1] && !expoStatus.lanUrl) {
            let lan = match[1];
            // In native mode, ensure we use exp:// scheme, not http://
            if (native && /^http:\/\//i.test(lan)) {
              lan = lan.replace(/^http:\/\//i, "exp://");
            }
            expoStatus.lanUrl = lan;
            // Default QR prefers LAN unless tunnel is explicitly requested
            if (!params.useTunnel) {
              expoStatus.qrUrl = lan;
            }
            log.log(`Found LAN URL: ${expoStatus.lanUrl}`);
            break;
          }
        }

        // Tunnel URL (when enabled) — only set once Metro is waiting/ready
        for (const pattern of tunnelUrlPatterns) {
          const match = output.match(pattern);
          if (match && match[1] && !expoStatus.tunnelUrl) {
            const candidate = match[1];
            const metroReady = output.includes('Metro waiting') || output.includes('Waiting on') || output.includes('Logs for your project');
            if (metroReady) {
              expoStatus.tunnelUrl = candidate;
              if (params.useTunnel) {
                expoStatus.qrUrl = candidate;
              }
              log.log(`Found tunnel URL (metro ready): ${expoStatus.tunnelUrl}`);
              break;
            } else {
              log.log(`Detected tunnel URL but metro not ready yet: ${candidate}`);
            }
          }
        }

        // Debug: Log all output when tunnel is enabled to help identify URL patterns
        if (params.useTunnel && (output.includes('tunnel') || output.includes('Tunnel') || output.includes('QR'))) {
          log.log(`Tunnel debug - output: ${output.trim()}`);
        }

        // If tunnel is ready but we haven't found a tunnel URL yet, 
        // and we have a LAN URL, use it as fallback for QR
        if (params.useTunnel && output.includes('Tunnel ready') && !expoStatus.qrUrl && expoStatus.lanUrl) {
          expoStatus.qrUrl = expoStatus.lanUrl;
          log.log(`Using LAN URL as QR fallback: ${expoStatus.qrUrl}`);
        }

        // Ensure we always have a QR URL if we have any URL available
        if (!expoStatus.qrUrl && (expoStatus.tunnelUrl || expoStatus.lanUrl)) {
          expoStatus.qrUrl = expoStatus.tunnelUrl || expoStatus.lanUrl;
          log.log(`Set QR URL to available URL: ${expoStatus.qrUrl}`);
        }

        // Store detected port for fallback
        const portMatch = output.match(/(?:Metro|Development server).*?localhost:(\d+)/i);
        if (portMatch && portMatch[1]) {
          detectedPort = portMatch[1];
          log.log(`Detected Expo port: ${detectedPort}`);
          // If no LAN URL yet and we have a port, synthesize one using local IP
          if (!expoStatus.lanUrl) {
            const ip = getLocalIP();
            if (ip && ip !== "localhost") {
              expoStatus.lanUrl = native ? `exp://${ip}:${detectedPort}` : `http://${ip}:${detectedPort}`;
              if (!params.useTunnel) {
                expoStatus.qrUrl = expoStatus.lanUrl;
              }
              log.log(`Synthesized LAN URL: ${expoStatus.lanUrl}`);
            }
          }
        }

        // Detect REAL hot reload events (VERY STRICT - only actual file changes)
        // Debounce to prevent false positives from rapid bundling
        const now = Date.now();
        const isRealHotReload = (
          output.includes('Fast Refresh') || 
          output.includes('Hot reloading') ||
          (output.includes('HMR') && !output.includes('LOG')) ||
          output.includes('hmr update') ||
          output.includes('File changed')
          // Removed generic 'Reloading' check as it's too broad
        );
        
        if (isRealHotReload && (now - lastAutoHotReload) > HOT_RELOAD_DEBOUNCE) {
          lastAutoHotReload = now;
          expoStatus.lastHotReload = now;
          expoStatus.buildStatus = 'success';
          log.log('🔥 Real hot reload detected in Expo output (debounced)');
        }

        // Detect build status
        if (output.includes('Starting Metro Bundler') || 
            output.includes('Metro waiting') ||
            output.includes('Bundling')) {
          expoStatus.buildStatus = 'building';
          expoStatus.buildProgress = output.includes('Metro waiting') ? 'Metro bundler ready' : 'Building...';
        }

        // Detect build progress
        if (output.includes('Bundled') && output.includes('ms')) {
          expoStatus.buildStatus = 'success';
          const bundleMatch = output.match(/Bundled (\d+ms)/);
          if (bundleMatch) {
            expoStatus.buildProgress = `Built in ${bundleMatch[1]}`;
          }
        }

        // Detect build errors
        if (output.includes('Failed to compile') || 
            output.includes('SyntaxError') ||
            output.includes('Error:') ||
            output.includes('TypeError')) {
          expoStatus.buildStatus = 'error';
          expoStatus.buildProgress = 'Build failed - check console';
        }

        // Reset build status to idle after successful operations
        if (output.includes('Logs for your project will appear below') ||
            output.includes('› Press')) {
          setTimeout(() => {
            if (expoStatus.buildStatus === 'success') {
              expoStatus.buildStatus = 'idle';
            }
          }, 3000);
        }
      });

      expoProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        log.warn("Expo stderr:", output);
        
        // Check for tunnel-related errors and failures
        if (output.includes('tunnel') || output.includes('ngrok') || output.includes('exp.direct')) {
          log.error("Tunnel error detected:", output);
          
          // If tunnel fails, we can still use LAN URL for QR
          if (output.includes('failed') || output.includes('error') || output.includes('timeout') || output.includes('took too long')) {
            log.warn("Tunnel failed, will use LAN URL for QR code");
            expoStatus.buildStatus = 'error';
            expoStatus.buildProgress = 'Tunnel failed - using local network';
            
            // Kill the process to trigger restart without tunnel
            if (expoProcess && !expoProcess.killed) {
              log.log("Killing Expo process due to tunnel failure");
              expoProcess.kill('SIGTERM');
            }
          }
        }

        // Check for common Expo errors that might cause process to stop
        if (output.includes('EADDRINUSE') || output.includes('port') && output.includes('use')) {
          log.error("Port conflict detected:", output);
          expoStatus.buildStatus = 'error';
          expoStatus.buildProgress = 'Port conflict - restart needed';
        }
      });

      expoProcess.on("close", (code) => {
        log.log(`Expo process exited with code ${code}`);
        expoProcess = null;
        
        // Provide specific feedback based on exit code
        let exitReason = 'Process stopped';
        if (code === 1) {
          exitReason = 'Process failed - check for errors';
        } else if (code === null) {
          exitReason = 'Process was terminated';
        } else if (code === 0) {
          exitReason = 'Process completed normally';
        }
        
        expoStatus = {
          isRunning: false,
          webUrl: "",
          lanUrl: "",
          tunnelUrl: "",
          qrUrl: "",
          terminalOutput: "",
          buildStatus: code === 0 ? 'idle' : 'error',
          buildProgress: exitReason
        };
        
        log.log(`Expo status updated: ${exitReason}`);
        
        // If the process exited unexpectedly (not code 0), just log it
        if (code !== 0 && code !== null) {
          log.error(`Expo server crashed with code ${code}. User will need to manually restart.`);
        }
      });

      expoProcess.on("error", (error) => {
        log.error("Expo process error:", error);
        expoProcess = null;
        expoStatus.isRunning = false;
      });

      // Set fallback web URL after 8 seconds if not detected (longer for dependency install)
      setTimeout(() => {
        if (expoStatus.isRunning && !expoStatus.webUrl) {
          // Use detected port or the port we specified as fallback
          const fallbackPort = detectedPort || availablePort.toString();
          if (!native) {
            expoStatus.webUrl = `http://localhost:${fallbackPort}`;
            log.log(`Using fallback web URL: ${expoStatus.webUrl} (detected port: ${detectedPort})`);
          }
          // Also ensure a QR URL fallback if none present
          if (!expoStatus.qrUrl) {
            const ip = getLocalIP();
            if (ip && ip !== "localhost") {
              expoStatus.lanUrl = native ? `exp://${ip}:${fallbackPort}` : `http://${ip}:${fallbackPort}`;
              expoStatus.qrUrl = expoStatus.lanUrl;
              log.log(`Using fallback LAN/QR URL: ${expoStatus.qrUrl}`);
            }
          }
          // PROXY DISABLED to prevent EPIPE errors
          // if (!native && expoStatus.webUrl && !proxyWorker) {
          //   try {
          //     proxyWorker = startProxy(expoStatus.webUrl, {
          //       onStarted: (proxyUrl: string) => {
          //         log.log(`Using proxied web URL for iframe: ${proxyUrl}`);
          //         expoStatus.webUrl = proxyUrl;
          //       },
          //     });
          //   } catch (e) {
          //     log.warn("Failed to start proxy for Expo web URL:", e);
          //   }
          // }
        }
      }, 8000);

      log.log("Expo dev server started successfully");
      return expoStatus;

    } catch (error) {
      log.error("Failed to start Expo:", error);
      expoStatus.isRunning = false;
      return { success: false, error: error.message, isRunning: false };
    } finally {
      // Always reset the mutex, even on error
      isStarting = false;
    }
  });

  ipcMain.handle("expo:stop", async () => {
    try {
      if (!expoProcess) {
        log.log("No Expo process to stop");
        return { success: true };
      }

      log.log("Stopping Expo dev server...");
      
      // Kill the process tree
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", expoProcess.pid!.toString(), "/f", "/t"]);
      } else {
        expoProcess.kill("SIGTERM");
      }

      expoProcess = null;
      expoStatus = {
        isRunning: false,
        webUrl: "",
        lanUrl: "",
        tunnelUrl: "",
        qrUrl: "",
        terminalOutput: "",
        buildStatus: 'idle'
      };

      log.log("Expo dev server stopped");
      return { success: true };

    } catch (error) {
      log.error("Failed to stop Expo:", error);
      throw error;
    }
  });

  ipcMain.handle("expo:status", async () => {
    return expoStatus;
  });

  // Test if the server is actually responding
  ipcMain.handle("expo:health-check", async () => {
    if (!expoStatus.isRunning || !expoStatus.webUrl) {
      return { healthy: false, reason: "Server not running or no webUrl" };
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const startTime = Date.now();
      const response = await fetch(expoStatus.webUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      const healthy = response.ok;
      
      log.log(`Health check for ${expoStatus.webUrl}: ${healthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
      return { 
        healthy, 
        reason: healthy ? 'Server responding' : `HTTP ${response.status}`,
        url: expoStatus.webUrl,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - Date.now();
      log.warn(`Health check failed for ${expoStatus.webUrl}:`, error);
      return { 
        healthy: false, 
        reason: `Connection failed: ${error.message}`,
        url: expoStatus.webUrl,
        responseTime
      };
    }
  });

  // Trigger hot reload manually (called when chat makes code changes)
  ipcMain.handle("expo:trigger-reload", async () => {
    try {
      if (expoStatus.isRunning) {
        expoStatus.lastHotReload = Date.now();
        expoStatus.buildStatus = 'success';
        log.log('🔥 Manual hot reload triggered from chat');
        return { success: true };
      } else {
        return { success: false, reason: "Expo not running" };
      }
    } catch (error) {
      log.error("Failed to trigger hot reload:", error);
      return { success: false, reason: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  // Reset handler to clear stuck states
  ipcMain.handle("expo:reset", async () => {
    try {
      log.log("🔄 Resetting Expo state...");
      
      // Kill any existing process
      if (expoProcess) {
        try {
          if (process.platform === "win32") {
            spawn("taskkill", ["/pid", expoProcess.pid!.toString(), "/f", "/t"]);
          } else {
            expoProcess.kill("SIGTERM");
          }
        } catch (e) {
          log.warn("Error killing existing process:", e);
        }
        expoProcess = null;
      }
      
      // Reset all state
      isStarting = false;
      expoStatus = {
        isRunning: false,
        webUrl: "",
        lanUrl: "",
        tunnelUrl: "",
        qrUrl: "",
        terminalOutput: "",
        buildStatus: 'idle'
      };
      
      log.log("✅ Expo state reset complete");
      return { success: true };
    } catch (error) {
      log.error("Failed to reset Expo state:", error);
      return { success: false, error: error.message };
    }
  });

}