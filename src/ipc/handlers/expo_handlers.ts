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
  /(?:LAN|Network):\s+(https?:\/\/[\d.]+:\d+)/i,
  /(?:LAN|Network):\s+(exp:\/\/[\d.]+:\d+)/i
];

// Tunnel URL patterns removed - using web-only sandbox approach

interface ExpoStatus {
  isRunning: boolean;
  webUrl: string;      // For iframe preview (required)
  lanUrl: string;     // For QR code (optional, for device testing)
  terminalOutput?: string;
  lastHotReload?: number; // Timestamp of last hot reload
  buildStatus?: 'idle' | 'building' | 'success' | 'error' | 'ready';
  buildProgress?: string; // Build progress message
}

let expoProcess: any = null;
let expoStatus: ExpoStatus = {
  isRunning: false,
  webUrl: "",
  lanUrl: "",
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
    params: { appId: number; native?: boolean },
  ) => {
    try {
      // Prevent multiple simultaneous starts
      if (isStarting) {
        log.warn("Expo start already in progress, ignoring duplicate request");
        return { success: false, error: "Start already in progress" };
      }
      
      isStarting = true;
      const { appId, native = false } = params;
      log.log(`🚀 Starting Expo for app ID: ${appId} (web-only sandbox mode)`);

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
        log.log("🎯 Mobile app detected, validating dependencies...");
        
        // 🚀 PRE-PREVIEW VALIDATION: Comprehensive validation before starting preview
        const { PrePreviewValidator } = await import("../../lib/expo/PrePreviewValidator");
        
        try {
          log.log("🔍 Running pre-preview validation...");
          
          // Initialize the validator
          const validator = new PrePreviewValidator(appPath);
          
          // Run all validation rules
          const validationResult = await validator.validateAll();
          
          if (!validationResult.passed) {
            log.log(`🚨 Pre-preview validation failed with ${validationResult.results.filter(r => !r.passed).length} issues:`);
            
            // Show all failed validations
            validationResult.results
              .filter(r => !r.passed)
              .forEach(result => {
                const emoji = result.severity === 'error' ? '❌' : '⚠️';
                log.log(`  ${emoji} ${result.rule}: ${result.message}`);
                if (result.details) {
                  log.log(`    Details: ${result.details}`);
                }
              });
            
            // Try to fix fixable issues
            if (validationResult.fixable) {
              log.log("🔧 Attempting to fix issues...");
              const fixResult = await validator.fixAll();
              
              if (fixResult.success) {
                log.log(`✅ Fixed ${fixResult.fixes.length} issues:`);
                fixResult.fixes.forEach(fix => log.log(`  ✅ ${fix.rule}: ${fix.message}`));
              } else {
                log.error("❌ Some issues could not be fixed:");
                fixResult.errors.forEach(error => log.error(`  ❌ ${error}`));
              }
            }
            
            // Check if we still have critical errors after fixing
            const stillHasErrors = validationResult.results.some(r => !r.passed && r.severity === 'error');
            if (stillHasErrors) {
              throw new Error(`Pre-preview validation failed with critical errors. Please fix the app manually.`);
            }
          } else {
            log.log("✅ Pre-preview validation passed - app is ready");
          }
          
          // 🚀 DYNAMIC APP REPAIRER: Additional repair if needed
          const { ExpoAppRepairer } = await import("../../lib/expo/ExpoAppRepairer");
          const repairer = new ExpoAppRepairer(appPath);
          const repairResult = await repairer.repairApp();
          
          if (repairResult.repaired) {
            log.log(`🔧 Additional repair completed! Fixed ${repairResult.fixes.length} issues:`);
            repairResult.fixes.forEach(fix => log.log(`  ✅ ${fix}`));
          }
          
          if (!repairResult.success) {
            log.error("❌ App repair failed:");
            repairResult.issues.forEach(issue => log.error(`  ❌ ${issue}`));
            throw new Error(`App repair failed: ${repairResult.issues.join(', ')}`);
          }
          
        } catch (validationError) {
          log.warn("⚠️ Dependency validation failed, attempting fallback installation:", validationError);
          
          // Fallback: Use smart Expo dependency management
          const { ExpoDependencyManager } = await import("../../lib/expo/ExpoDependencyManager");
          
          try {
            // Smart dependency management with conflict resolution
            const depManager = new ExpoDependencyManager(appPath);
            const depsReady = await depManager.ensureEssentialDependencies();
            
            if (!depsReady) {
              log.log("📦 Installing core dependencies with optimized package manager...");
              
              // Import runPackageManagerCommand
              const { runPackageManagerCommand } = await import("../../lib/hermetic-runtime");
              
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

        // 🚀 METRO CONFIGURATION CHECK: Ensure Metro is properly configured
        try {
          const metroConfigPath = path.join(appPath, 'metro.config.js');
          if (!fs.existsSync(metroConfigPath)) {
            log.log("📦 Creating Metro configuration for proper bundling...");
            
            const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper asset handling
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
`;
            
            fs.writeFileSync(metroConfigPath, metroConfig);
            log.log("✅ Metro configuration created");
          } else {
            log.log("✅ Metro configuration already exists");
          }
        } catch (err) {
          log.warn("Could not create Metro configuration:", err);
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
      
      // 🚀 SANDBOX MODE: Web-only preview with LAN support for QR codes
      // No tunnel mode - OS-independent operation
      const expoArgs: string[] = [
        "start",
        "--clear",
        "--port", availablePort.toString(),
        "--web",  // Web preview for iframe
        "--lan"   // LAN mode for QR code generation (optional device testing)
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

          // Wait longer for Expo and Metro to fully initialize
          await new Promise((resolve) => setTimeout(resolve, 5000));
          
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

        // 🎯 STEP 1: Look for LAN URL for QR code generation (optional device testing)
        if (!hasFoundQR) {
          // Look for exp:// URLs (native QR codes)
          const expMatch = output.match(/(exp:\/\/[^\s\n\r]+)/i);
          if (expMatch) {
            expoStatus.lanUrl = expMatch[1];
            hasFoundQR = true;
            log.log(`📱 LAN URL found for QR code: ${expMatch[1]}`);
            
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
          const lanMatch = output.match(/(?:LAN|Network):\s+(https?:\/\/[\d.]+:\d+)/i);
          if (lanMatch && !expoStatus.lanUrl) {
            expoStatus.lanUrl = lanMatch[1];
            hasFoundQR = true;
            log.log(`📱 LAN URL found: ${lanMatch[1]}`);
          }
        }

        // 🚀 METRO BUNDLER DETECTION: Look for Metro bundler startup messages
        if (output.includes('Metro waiting on') || output.includes('Metro bundler') || output.includes('Metro server')) {
          log.log(`🚇 Metro bundler detected: ${output.trim()}`);
          expoStatus.buildStatus = 'building';
        }
        
        // 🚀 METRO BUNDLER READY: Look for Metro ready messages
        if (output.includes('Metro waiting on') || output.includes('Ready!') || output.includes('Metro server running')) {
          log.log(`✅ Metro bundler ready: ${output.trim()}`);
          expoStatus.buildStatus = 'ready';
          
          // 🚀 HEALTH CHECK: Verify Metro bundler is actually serving content
          if (expoStatus.webUrl) {
            setTimeout(async () => {
              try {
                const response = await fetch(expoStatus.webUrl);
                if (response.ok) {
                  log.log(`✅ Metro bundler health check passed: ${expoStatus.webUrl} is serving content`);
                  expoStatus.buildStatus = 'ready';
                } else {
                  log.warn(`⚠️ Metro bundler health check failed: ${expoStatus.webUrl} returned ${response.status}`);
                  expoStatus.buildStatus = 'error';
                }
              } catch (error) {
                log.warn(`⚠️ Metro bundler health check failed: ${expoStatus.webUrl} is not accessible - ${error}`);
                expoStatus.buildStatus = 'error';
              }
            }, 2000); // Wait 2 seconds for Metro to fully start
          }
        }

        // 🎯 STEP 3: Capture web URL after pressing 'w' - ENHANCED PATTERNS
        const webPatterns = [
          /(?:Local|Web):\s+(https?:\/\/localhost:\d+)/i,
          /(?:Web):\s+(https?:\/\/localhost:\d+)/i,
          /(?:Local):\s+(https?:\/\/localhost:\d+)/i,
          /https?:\/\/localhost:\d+/g,
          /(?:Web server running at|Local server running at|Development server running at):\s*(https?:\/\/localhost:\d+)/i,
          /(?:Metro waiting on|Metro server running on):\s*(https?:\/\/localhost:\d+)/i,
          /(?:Press w │ open web):\s*(https?:\/\/localhost:\d+)/i
        ];
        
        for (const pattern of webPatterns) {
          const webMatch = output.match(pattern);
          if (webMatch) {
            const webUrl = webMatch[1] || webMatch[0];
            if (webUrl && webUrl.includes('localhost')) {
              expoStatus.webUrl = webUrl;
              log.log(`🌐 Web URL captured: ${webUrl}`);
              break;
            }
          }
        }

        // Tunnel URL detection removed - using web-only sandbox approach

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
          // 🚀 ENHANCED: More flexible Metro ready detection
          const isMetroReady = output.includes('Metro waiting') || 
              output.includes('Logs for your project') || 
              output.includes('› Press') ||
              output.includes('Press w │ open web') ||
              output.includes('Press a │ open Android') ||
              output.includes('Press i │ open iOS') ||
              output.includes('Metro') ||
              (output.includes('Bundled') && output.includes('ms')) ||
              output.includes('Starting Metro Bundler') ||
              output.includes('Metro bundler running') ||
              output.includes('Ready!') ||
              // 🚀 FALLBACK: If we see the URL pattern, assume it's ready after a short delay
              (detectedWebUrl.includes('localhost') && output.includes('http'));
              
          if (isMetroReady) {
            expoStatus.webUrl = detectedWebUrl;
            log.log(`✅ Metro bundler is ready! Setting web URL: ${expoStatus.webUrl}`);
          } else {
            log.log(`⏳ Metro bundler detected but not ready yet: ${detectedWebUrl}`);
            // 🚀 FALLBACK: Set URL after 5 seconds if Metro patterns aren't found
            setTimeout(() => {
              if (!expoStatus.webUrl && detectedWebUrl) {
                expoStatus.webUrl = detectedWebUrl;
                log.log(`🚀 Fallback: Setting web URL after timeout: ${expoStatus.webUrl}`);
                
                // 🚀 HEALTH CHECK: Verify the URL is actually serving content
                fetch(detectedWebUrl)
                  .then(response => {
                    if (response.ok) {
                      log.log(`✅ Health check passed: ${detectedWebUrl} is serving content`);
                    } else {
                      log.warn(`⚠️ Health check failed: ${detectedWebUrl} returned ${response.status}`);
                    }
                  })
                  .catch(error => {
                    log.warn(`⚠️ Health check failed: ${detectedWebUrl} is not accessible:`, error.message);
                  });
              }
            }, 5000);
          }
        }

        // LAN URL for QR code generation (optional device testing)
        for (const pattern of lanUrlPatterns) {
          const match = output.match(pattern);
          if (match && match[1] && !expoStatus.lanUrl) {
            let lan = match[1];
            // In native mode, ensure we use exp:// scheme, not http://
            if (native && /^http:\/\//i.test(lan)) {
              lan = lan.replace(/^http:\/\//i, "exp://");
            }
            expoStatus.lanUrl = lan;
            log.log(`Found LAN URL: ${expoStatus.lanUrl}`);
            break;
          }
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
        
        // Tunnel-related error handling removed - using web-only sandbox approach

        // 🚀 METRO BUNDLER ERROR DETECTION: Look for Metro-specific errors
        if (output.includes('Metro') || output.includes('bundler') || output.includes('bundling')) {
          log.error(`🚇 Metro bundler error: ${output.trim()}`);
          expoStatus.buildStatus = 'error';
          expoStatus.buildProgress = 'Metro bundler error detected';
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
          // Ensure LAN URL fallback for QR code generation
          if (!expoStatus.lanUrl) {
            const ip = getLocalIP();
            if (ip && ip !== "localhost") {
              expoStatus.lanUrl = native ? `exp://${ip}:${fallbackPort}` : `http://${ip}:${fallbackPort}`;
              log.log(`Using fallback LAN URL: ${expoStatus.lanUrl}`);
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
    }
    } catch (error: any) {
      log.error("Failed to start Expo:", error);
      expoStatus.isRunning = false;
      return { success: false, error: error?.message || String(error), isRunning: false };
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(expoStatus.webUrl, { signal: controller.signal as any });
      clearTimeout(timeoutId);
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