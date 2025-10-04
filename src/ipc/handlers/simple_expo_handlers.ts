import { ipcMain } from "electron";
import { spawn } from "child_process";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { execAsync } from "../utils/runShellCommand";
import log from "electron-log";
import { unifiedInstallDependencies, areDependenciesInstalled } from "./unified_dependency_manager";
import { spawnNode, checkNodeToolsAvailability } from "../../lib/node-runtime";
import { findMissingDependencies } from "./dependency_validator";

interface SimpleExpoStatus {
  isRunning: boolean;
  webUrl: string;
  qrUrl: string;
  lanUrl: string;
  tunnelUrl: string;
  terminalOutput: string;
}

// Global state
let expoProcess: any = null;
let expoStatus: SimpleExpoStatus = {
  isRunning: false,
  webUrl: "",
  qrUrl: "",
  lanUrl: "",
  tunnelUrl: "",
  terminalOutput: ""
};

// Keep track of the most recent start options so parsing logic can respect them
let currentStartOptions: { useTunnel: boolean } = { useTunnel: true };

export function registerSimpleExpoHandlers() {
  log.log("🎯 Registering Expo handlers with guaranteed port allocation");
  
  // Check Node.js tools availability for diagnostics (outside try-catch to not block registration)
  try {
    const toolsAvailability = checkNodeToolsAvailability();
    log.log("🔧 Node.js tools availability:", toolsAvailability);
    
    if (!toolsAvailability.node || !toolsAvailability.npm || !toolsAvailability.npx) {
      log.warn("⚠️ Some Node.js tools are not available. Expo functionality may be limited.");
      log.warn("Tool paths:", toolsAvailability.paths);
    }
  } catch (error) {
    log.warn("⚠️ Failed to check Node.js tools on startup:", error);
  }

  // Kill any process using a specific port (Windows/Linux/Mac compatible)
  const killProcessOnPort = async (port: number): Promise<boolean> => {
    try {
      log.log(`🔫 Attempting to kill process on port ${port}...`);
      
      if (process.platform === "win32") {
        // Windows: netstat + taskkill
        const { spawn } = require("child_process");
        return new Promise<boolean>((resolve) => {
          const netstat = spawn("netstat", ["-ano"], { shell: true });
          let output = "";
          
          netstat.stdout?.on("data", (data: Buffer) => {
            output += data.toString();
          });
          
          netstat.on("close", () => {
            const lines = output.split("\n");
            const portLine = lines.find(line => 
              line.includes(`:${port} `) && (line.includes("LISTENING") || line.includes("ESTABLISHED"))
            );
            
            if (portLine) {
              const pid = portLine.trim().split(/\s+/).pop();
              if (pid && pid !== "0") {
                log.log(`🎯 Found PID ${pid} using port ${port}, killing...`);
                spawn("taskkill", ["/pid", pid, "/f"], { shell: true })
                  .on("close", (code: number | null) => {
                    log.log(`✅ Kill result for PID ${pid}: exit code ${code}`);
                    resolve(code === 0);
                  });
                return;
              }
            }
            log.log(`ℹ️ No process found using port ${port}`);
            resolve(true);
          });
        });
      } else {
        // Unix/Linux/Mac: lsof + kill
        const { exec } = require("child_process");
        return new Promise<boolean>((resolve) => {
          exec(`lsof -ti:${port}`, (error: any, stdout: string) => {
            if (error) {
              log.log(`ℹ️ No process found using port ${port}`);
              resolve(true);
              return;
            }
            
            const pid = stdout.trim();
            if (pid) {
              log.log(`🎯 Found PID ${pid} using port ${port}, killing...`);
              exec(`kill -9 ${pid}`, (killError: any) => {
                log.log(`✅ Kill result for PID ${pid}: ${killError ? 'failed' : 'success'}`);
                resolve(!killError);
              });
            } else {
              resolve(true);
            }
          });
        });
      }
    } catch (error) {
      log.warn(`⚠️ Error killing process on port ${port}:`, error);
      return false;
    }
  };

  // Enhanced port finder: guaranteed port allocation
  const findAvailablePort = async (basePort: number = 8081, maxTries = 20): Promise<number> => {
    log.log(`🔍 Scanning for available port starting from ${basePort}...`);
    
    for (let i = 0; i < maxTries; i++) {
      const port = basePort + i;
      // eslint-disable-next-line no-await-in-loop
      const isAvailable = await new Promise<boolean>((resolve) => {
        const server = net.createServer();
        server.once("error", () => {
          log.log(`❌ Port ${port} is occupied`);
          resolve(false);
        });
        server.once("listening", () => {
          server.close(() => {
            log.log(`✅ Port ${port} is available`);
            resolve(true);
          });
        });
        server.listen(port, "0.0.0.0");
      });
      
      if (isAvailable) {
        log.log(`🎯 Selected port ${port} for Expo Metro server`);
        return port;
      } else if (port === basePort) {
        // Try to kill process on preferred port (8081) only - dedicate it to Applaa
        log.log(`🔫 Port ${port} occupied, attempting to reclaim for Applaa...`);
        // eslint-disable-next-line no-await-in-loop
        const killed = await killProcessOnPort(port);
        if (killed) {
          // Wait a moment for port to be freed
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(resolve, 2000));
          // eslint-disable-next-line no-await-in-loop
          const nowAvailable = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once("error", () => resolve(false));
            server.once("listening", () => {
              server.close(() => resolve(true));
            });
            server.listen(port, "0.0.0.0");
          });
          
          if (nowAvailable) {
            log.log(`🎉 Successfully reclaimed port ${port} for Applaa!`);
            return port;
          } else {
            log.warn(`⚠️ Failed to reclaim port ${port}, continuing search...`);
          }
        }
      }
    }
    
    // If all ports in range are busy, let OS pick random port
    log.warn(`⚠️ All ports ${basePort}-${basePort + maxTries - 1} are busy, using OS-assigned port`);
    return new Promise<number>((resolve) => {
      const server = net.createServer();
      server.once("listening", () => {
        const address = server.address();
        const chosen = typeof address === "object" && address ? address.port : basePort;
        log.log(`🔄 OS assigned port: ${chosen}`);
        server.close(() => resolve(chosen));
      });
      server.listen(0, "0.0.0.0");
    });
  };

  // Helper: compute first private IPv4 LAN URL
  const getLanUrl = (port: number): string | null => {
    try {
      const ifaces = os.networkInterfaces();
      for (const name of Object.keys(ifaces)) {
        const addrs = ifaces[name] || [];
        for (const addr of addrs) {
          if (
            addr.family === 'IPv4' &&
            !addr.internal &&
            (
              addr.address.startsWith('192.168.') ||
              addr.address.startsWith('10.') ||
              /^172\.(1[6-9]|2[0-9]|3[01])\./.test(addr.address)
            )
          ) {
            return `http://${addr.address}:${port}`;
          }
        }
      }
    } catch {}
    return null;
  };

  // Helper: turn http(s)://host:port into exp://host:port for Expo Go deep-link
  const toExpUrl = (url: string): string => {
    try {
      const m = url.match(/^https?:\/\/([^\/:]+)(?::(\d+))?/i);
      if (m) {
        const host = m[1];
        const port = m[2] || '8081';
        return `exp://${host}:${port}`;
      }
    } catch {}
    return url.replace(/^https?:\/\//i, 'exp://');
  };

  // Helper: Poll .expo/packager-info.json for tunnel URL (.exp.direct / expo.dev / tunnels.expo.dev)
  const startTunnelPoller = (projectRoot: string) => {
    try {
      const infoPath = path.join(projectRoot, ".expo", "packager-info.json");
      let attempts = 0;
      const maxAttempts = 45; // ~45s

      const tryRead = () => {
        attempts++;
        try {
          if (!fs.existsSync(infoPath)) return;
          const raw = fs.readFileSync(infoPath, "utf8");
          if (!raw) return;
          const data = JSON.parse(raw || "{}");
          const candidates: string[] = [
            data.packagerTunnelUrl,
            data.packagerNgrokUrl,
            data.expoServerNgrokUrl,
            data.expoGoUrl,
            data.manifestTunnelUrl,
            data.tunnelUrl
          ].filter((x: any) => typeof x === "string");

          const picked = candidates.find((u) =>
            u && (u.includes(".exp.direct") || u.includes(".expo.dev") || u.includes("tunnels.expo.dev") || u.startsWith("exp://"))
          );

          if (picked) {
            if (expoStatus.tunnelUrl !== picked) {
              expoStatus.tunnelUrl = picked;
              expoStatus.qrUrl = picked; // QR must be tunnel URL
              if (!expoStatus.webUrl) {
                // Keep webUrl as-is if already set; otherwise default to local web for iframe
                expoStatus.webUrl = expoStatus.webUrl || `http://localhost:8081`;
              }
              log.log(`🔎 Found tunnel from packager-info.json: ${picked}`);
            }
            return true;
          }
        } catch (err) {
          // ignore JSON parse errors while file is being written
        }
        return false;
      };

      const timer = setInterval(() => {
        const ok = tryRead();
        if (ok || attempts >= maxAttempts) {
          clearInterval(timer);
        }
      }, 1000);
    } catch (e) {
      log.warn("Tunnel poller error:", e);
    }
  };

  // Package Update - Fix version mismatches
  ipcMain.handle("simple-expo:update-packages", async (_, params: { appId: number }) => {
    try {
      const { appId } = params;
      log.log(`📦 Updating packages for app ID: ${appId}`);
      
      // Get app data
      const appData = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData[0]) {
        throw new Error("App not found");
      }
      
      const appPath = getDyadAppPath(appData[0].path);
      log.log(`Updating packages in: ${appPath}`);
      
      // Update to expected versions based on Expo SDK 53
      const updateCommands = [
        "npx expo install expo@53.0.22",
        "npx expo install expo-router@~5.1.5", 
        "npx expo install react-native@0.79.5",
        "npx expo install typescript@~5.8.3",
        "npm install" // Final install to resolve dependencies
      ];
      
      let updateOutput = "";
      
      for (const command of updateCommands) {
        try {
          log.log(`Running: ${command}`);
          updateOutput += `$ ${command}\n`;
          
          const result = await execAsync(command, { 
            cwd: appPath,
            timeout: 120000 // 2 minute timeout per command
          });
          
          updateOutput += result.stdout + "\n";
          if (result.stderr) {
            updateOutput += `STDERR: ${result.stderr}\n`;
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          updateOutput += `ERROR: ${errorMsg}\n`;
          log.warn(`Package update command failed: ${command}`, error);
        }
      }
      
      return {
        success: true,
        output: updateOutput,
        message: "Package versions updated to match Expo SDK 53"
      };
      
    } catch (error) {
      log.error("Package update failed:", error);
      return {
        success: false,
        output: "",
        message: `Package update failed: ${error.message}`
      };
    }
  });

  // Metro Recovery - Force kill all processes and clean port 8081
  ipcMain.handle("simple-expo:metro-recovery", async () => {
    try {
      log.log("🚨 METRO RECOVERY: Starting aggressive cleanup...");
      
      // Kill all processes on port 8081
      await killProcessOnPort(8081);
      
      // Kill expo/metro processes more selectively to avoid affecting main app
      if (process.platform === "win32") {
        try {
          // Only kill expo processes, not all node processes
          spawn("taskkill", ["/f", "/im", "expo.exe"], { shell: true });
          
          // Kill node processes that specifically have "expo" or "metro" in their command line
          // This is much safer than killing all node processes
          spawn("wmic", [
            "process", "where", 
            "name='node.exe' and (commandline like '%expo%' or commandline like '%metro%')", 
            "delete"
          ], { shell: true });
        } catch (e) {
          log.warn("Error killing expo/metro processes:", e);
        }
      } else {
        try {
          // Unix/Linux/Mac: Kill expo and metro processes specifically
          spawn("pkill", ["-f", "expo"], { shell: true });
          spawn("pkill", ["-f", "metro"], { shell: true });
        } catch (e) {
          log.warn("Error killing expo processes:", e);
        }
      }
      
      // Wait for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify port 8081 is now free
      const isPortFree = await new Promise<boolean>((resolve) => {
        const testServer = require('net').createServer();
        testServer.listen(8081, () => {
          testServer.close();
          resolve(true);
        });
        testServer.on('error', () => resolve(false));
      });
      
      log.log(`🔍 Port 8081 status after cleanup: ${isPortFree ? 'FREE' : 'STILL OCCUPIED'}`);
      
      return {
        success: true,
        portFree: isPortFree,
        message: isPortFree ? "Metro recovery successful - port 8081 is now free" : "Metro recovery partial - port may still be occupied"
      };
      
    } catch (error) {
      log.error("Metro recovery failed:", error);
      return {
        success: false,
        portFree: false,
        message: `Metro recovery failed: ${error.message}`
      };
    }
  });

  // Simple Expo start - just run npx expo start and parse output
  ipcMain.handle("simple-expo:start", async (
    _,
    params: { appId: number; useTunnel?: boolean }
  ) => {
    try {
      const { appId, useTunnel = true } = params;
  currentStartOptions.useTunnel = !!useTunnel;
      
      log.log(`🚀 Simple Expo Start - App ID: ${appId}, Tunnel: ${useTunnel}`);
      
      // AGGRESSIVE CLEANUP: Stop any existing process AND kill port 8081
      if (expoProcess) {
        try {
          if (process.platform === "win32") {
            spawn("taskkill", ["/pid", expoProcess.pid!.toString(), "/f", "/t"]);
          } else {
            expoProcess.kill("SIGTERM");
          }
        } catch (e) {
          log.warn("Error stopping existing process:", e);
        }
        expoProcess = null;
      }

      // ALWAYS kill any process using port 8081 before starting
      log.log("🔫 Pre-cleaning port 8081 for Applaa dedication...");
      await killProcessOnPort(8081);
      
      // Wait for port to be fully freed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get app data
      const appData = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData[0]) {
        throw new Error("App not found");
      }

  const appPath = getDyadAppPath(appData[0].path);
  log.log(`Starting Expo in: ${appPath}`);

      // Reset status
      expoStatus = {
        isRunning: false,
        webUrl: "",
        qrUrl: "",
        lanUrl: "",
        tunnelUrl: "",
        terminalOutput: ""
      };

      // Ensure expo module AND @expo/ngrok are installed first (if tunnel mode)
      log.log("📦 Checking expo module installation...");
      const packageJsonPath = path.join(appPath, 'package.json');
      const nodeModulesPath = path.join(appPath, 'node_modules');
      const expoModulePath = path.join(nodeModulesPath, 'expo');
      const ngrokModulePath = path.join(nodeModulesPath, '@expo', 'ngrok');
      let needsExpoInstall = false;
      let needsNgrokInstall = useTunnel && !fs.existsSync(ngrokModulePath);
      
      // Check if node_modules exists and expo is actually installed
      if (!fs.existsSync(nodeModulesPath)) {
        needsExpoInstall = true;
        log.log("⚠️ node_modules directory not found - need to install dependencies");
      } else if (!fs.existsSync(expoModulePath)) {
        needsExpoInstall = true;
        log.log("⚠️ expo module not found in node_modules - need to install expo");
      } else {
        log.log("✅ expo module found in node_modules");
      }
      
      if (needsExpoInstall) {
        log.log("📦 Fixing package.json and installing dependencies...");
        expoStatus.terminalOutput += "📦 Fixing package.json and installing dependencies...\n";
        
        // Fix common invalid package versions before installing
        try {
          if (fs.existsSync(packageJsonPath)) {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            let packageJson = JSON.parse(packageContent);
            let needsFixing = false;
            
            // Fix common invalid versions
            const fixes = {
              "@react-native-async-storage/async-storage": {
                invalid: ["1.25.0"],
                fix: "^1.23.1"
              },
              "@types/react-native": {
                invalid: ["~0.79.0"],
                fix: "^0.73.0"
              },
              "expo-battery": {
                invalid: ["~7.0.1"],
                fix: "~6.0.1"
              },
              "typescript": {
                invalid: ["~5.8.3"],
                fix: "~5.3.3"
              }
            };
            
            // Check and fix dependencies
            for (const [pkg, config] of Object.entries(fixes)) {
              const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
              if (allDeps[pkg] && config.invalid.includes(allDeps[pkg])) {
                if (packageJson.dependencies && packageJson.dependencies[pkg]) {
                  packageJson.dependencies[pkg] = config.fix;
                  needsFixing = true;
                  log.log(`🔧 Fixed ${pkg}: ${allDeps[pkg]} -> ${config.fix}`);
                }
                if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
                  packageJson.devDependencies[pkg] = config.fix;
                  needsFixing = true;
                  log.log(`🔧 Fixed ${pkg}: ${allDeps[pkg]} -> ${config.fix}`);
                }
              }
            }
            
            // Write back the fixed package.json
            if (needsFixing) {
              fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
              log.log("✅ package.json fixed");
              expoStatus.terminalOutput += "✅ package.json fixed\n";
            }
          }
        } catch (fixError) {
          log.warn("⚠️ Could not fix package.json:", fixError);
        }
        
        const installSuccess = await unifiedInstallDependencies(appPath, appId, 'expo-preview');
        
        if (!installSuccess) {
          log.error("❌ Unified dependency installation failed");
          expoStatus.terminalOutput += "❌ Unified dependency installation failed\n";
          throw new Error("Failed to install dependencies with unified manager");
        }
        
        log.log("✅ Dependencies installed successfully with unified manager");
        expoStatus.terminalOutput += "✅ Dependencies installed successfully\n";
      }

      // Double-check that node_modules and expo are actually present after installation
      if (!fs.existsSync(nodeModulesPath)) {
        log.error("❌ node_modules still missing after npm install");
        expoStatus.terminalOutput += "❌ node_modules still missing after npm install\n";
        throw new Error("npm install failed to create node_modules directory");
      }

      if (!fs.existsSync(expoModulePath)) {
        log.log("📦 Expo module missing, attempting specific installation...");
        expoStatus.terminalOutput += "📦 Installing expo module specifically...\n";
        
        // Try multiple installation strategies
        try {
          // Strategy 1: Direct npm install of expo
          log.log("📦 Strategy 1: Direct npm install expo");
          await execAsync("npm install expo --save", {
            cwd: appPath,
            timeout: 180000 // 3 minutes
          });
          
          if (!fs.existsSync(expoModulePath)) {
            // Strategy 2: npm install with --legacy-peer-deps
            log.log("📦 Strategy 2: npm install with --legacy-peer-deps");
            await execAsync("npm install expo --save --legacy-peer-deps", {
              cwd: appPath,
              timeout: 180000
            });
          }
          
          if (!fs.existsSync(expoModulePath)) {
            // Strategy 3: Try with force
            log.log("📦 Strategy 3: npm install with --force");
            await execAsync("npm install expo --save --force", {
              cwd: appPath,
              timeout: 180000
            });
          }

          // Final verification
          if (!fs.existsSync(expoModulePath)) {
            log.error("❌ All installation strategies failed");
            expoStatus.terminalOutput += "❌ Failed to install expo module with all strategies\n";
            throw new Error("expo module installation failed with all strategies");
          }
          
          log.log("✅ expo module successfully installed");
          expoStatus.terminalOutput += "✅ expo module installed\n";
          
        } catch (installError) {
          log.error("❌ Expo installation error:", installError);
          expoStatus.terminalOutput += `❌ Installation error: ${installError}\n`;
          throw new Error(`Failed to install expo module: ${installError}`);
        }
      } else {
        log.log("✅ expo module already present");
      }

      // Install @expo/ngrok if tunnel mode is enabled and it's not installed
      if (needsNgrokInstall) {
        log.log("🚇 Installing @expo/ngrok for tunnel mode...");
        expoStatus.terminalOutput += "🚇 Installing tunnel dependencies...\n";
        try {
          await execAsync("npm install @expo/ngrok@^4.1.0 --save", {
            cwd: appPath,
            timeout: 120000 // 2 minutes
          });
          
          if (fs.existsSync(ngrokModulePath)) {
            log.log("✅ @expo/ngrok successfully installed");
            expoStatus.terminalOutput += "✅ Tunnel module installed\n";
          } else {
            log.warn("⚠️ @expo/ngrok installation verification failed, but continuing...");
            expoStatus.terminalOutput += "⚠️ Tunnel module may not be available\n";
          }
        } catch (ngrokError) {
          log.error("❌ @expo/ngrok installation error:", ngrokError);
          expoStatus.terminalOutput += `⚠️ Tunnel setup failed, continuing without tunnel\n`;
          // Don't throw - continue without tunnel support
        }
      } else if (useTunnel) {
        log.log("✅ @expo/ngrok already present");
      }

      // NON-INTERACTIVE PORT SELECTION: pick the first free port starting at 8081
      log.log("🎯 Selecting a free Metro port starting at 8081 (non-interactive)...");
      const net = require('net');
      const isPortFree = (port: number) => new Promise<boolean>((resolve) => {
        const s = net.createServer();
        s.once('listening', () => s.close(() => resolve(true)));
        s.once('error', () => resolve(false));
        s.listen(port, '0.0.0.0');
      });
      let finalPort = 8081;
      while (!(await isPortFree(finalPort)) && finalPort < 8100) {
        finalPort += 1;
      }
      log.log(`✅ Using Metro port ${finalPort} (auto-selected)`);
      
      const portMessage = `Using port ${finalPort}\n`;
      expoStatus.terminalOutput += portMessage;
      log.log(`✅ ${portMessage.trim()}`);

      // 🔍 OPTIONAL: Check for missing dependencies BEFORE starting Expo
      // Skip this check for now - let Expo handle missing dependencies
      log.log("🔍 Scanning code for missing dependencies...");
      expoStatus.terminalOutput += "🔍 Validating dependencies...\n";
      
      try {
        const missingDeps = findMissingDependencies(appPath);
        
        if (missingDeps.length > 0) {
          log.warn(`⚠️ Found ${missingDeps.length} missing dependencies:`, missingDeps);
          expoStatus.terminalOutput += `⚠️ Found missing: ${missingDeps.join(", ")} - Expo will handle installation\n`;
          // Don't block startup - let Expo handle it
        } else {
          log.log("✅ All dependencies are installed");
          expoStatus.terminalOutput += "✅ All dependencies validated\n";
        }
      } catch (error: any) {
        log.warn("⚠️ Dependency scan failed (non-critical):", error);
        expoStatus.terminalOutput += "⚠️ Dependency scan skipped\n";
      }

      // Skip ngrok installation - Expo CLI will handle it if needed
      if (useTunnel) {
        log.log("🚇 Tunnel mode requested - Expo CLI will handle @expo/ngrok installation if needed");
        expoStatus.terminalOutput += "🚇 Tunnel mode enabled\n";
      }

      // Build command with SUPPORTED anti-interactive flags only
      const args = [
        "expo", "start", 
        "--clear",
        "--web"
        // 🚨 CRITICAL: Do NOT specify --port in CLI args!
        // Expo CLI will prompt if port is busy when specified in args
        // Instead, use PORT env var which allows auto-selection
      ];
      
      // Use tunnel mode for public access through Expo Go
      if (useTunnel) {
        args.push("--tunnel");
        log.log("🚇 Using tunnel mode for public access");
      } else {
        args.push("--lan");  // Changed from --localhost to --lan for LAN access
        log.log("🌐 Using LAN mode for network access");
      }

      log.log(`🚀 Starting Expo: npx ${args.join(" ")}`);

    // Start Expo process with non-interactive configuration
  expoProcess = spawnNode("npx", args, {
        cwd: appPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
      // 🚨 CRITICAL PORT FIX: These are the ONLY flags that actually work!
      CI: 'true',                          // ✅ Must be string 'true', not '1'
      EXPO_NO_TELEMETRY: 'true',
      // Fix Windows path normalization issues
      TS_NODE_PROJECT: undefined,          // Clear any existing TS project config
      TS_CONFIG_PATH: undefined,           // Clear any existing TS config path
      EXPO_USE_DEV_SERVER: 'true',
      NODE_ENV: 'development',
      
      // 🚨 PORT ALLOCATION: Critical env vars for auto-selection
      PORT: String(finalPort),             // Preferred port
      REACT_NATIVE_PACKAGER_PORT: String(finalPort), // Alternative port var
      RCT_METRO_PORT: String(finalPort),
      REACT_NATIVE_PACKAGER_HOSTNAME: '0.0.0.0',
      
      // 🚨 DISABLE ALL PROMPTS
      EXPO_NO_WEB_SETUP: 'true',
      EXPO_NO_DOTENV: 'true',
      EXPO_NO_GIT_STATUS: 'true',
      EXPO_NO_UPDATE_CHECK: 'true',
      EXPO_NO_TYPESCRIPT_SETUP: 'true',
      EXPO_NO_ANALYTICS: 'true',
      EXPO_NO_REDIRECT: 'true',
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      
      // 🚨 NUCLEAR OPTION: Skip entirely if port is busy
      // This prevents the prompt by making Expo fail fast instead
      EXPO_NO_METRO: 'false',  // Keep Metro enabled
      SKIP_BUNDLING: 'false'   // Keep bundling enabled
        }
      });

      // Start polling for tunnel URL from packager-info.json as a reliable source
      if (useTunnel) {
        startTunnelPoller(appPath);
      }

      // Proactively compute and set LAN URL for QR fallback when tunnel is slow
      const computedLan = getLanUrl(finalPort);
      if (computedLan) {
        expoStatus.lanUrl = computedLan;
        log.log(`📡 Computed LAN URL: ${computedLan}`);
      }

      // Set a delayed fallback to exp://LAN if tunnel is requested but not yet available
      let lanFallbackTimer: NodeJS.Timeout | null = null;
      if (useTunnel) {
        lanFallbackTimer = setTimeout(() => {
          if (!expoStatus.qrUrl && expoStatus.lanUrl) {
            expoStatus.qrUrl = toExpUrl(expoStatus.lanUrl);
            log.log(`⏱️ Delayed QR fallback: Using Expo deep link ${expoStatus.qrUrl}`);
          }
        }, 12000); // wait ~12s for tunnel first
      }

  // Track state
  let hasFoundQR = false;
  let tunnelReadyButNoUrl = false;
  let hasStartedWeb = true; // --web starts web server automatically

      // Output parsing: prioritize tunnel URLs for consistent access
      expoProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
  log.log("📺 Expo Output:", output);
        
        expoStatus.terminalOutput += output;
        expoStatus.isRunning = true;

  // 🎯 Debug: Log full output chunk for tunnel URL analysis
        if (data.includes('tunnel') || data.includes('exp://') || data.includes('QR')) {
          log.log(`🔍 Tunnel/QR Debug Output: ${data.slice(0, 500)}`);
        }

        // 🎯 STEP 1: Status detection
        const tunnelMatches = [
          output.match(/(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev[^\s]*)/i),
          output.match(/(https?:\/\/[a-zA-Z0-9-]+\.exp\.direct[^\s]*)/i),
          output.match(/Tunnel:\s+(https?:\/\/[^\s]+)/i),
          output.match(/tunnel.*?(https?:\/\/[^\s]+\.expo\.dev[^\s]*)/i)
        ].filter(Boolean);
        
    if (tunnelMatches.length > 0 && tunnelMatches[0]) {
          const newTunnelUrl = tunnelMatches[0][1];
          if (newTunnelUrl !== expoStatus.tunnelUrl) {
            expoStatus.tunnelUrl = newTunnelUrl;
            // 🎯 STRATEGY: Use tunnel URL for BOTH QR and web preview (consistent external access)
            expoStatus.qrUrl = newTunnelUrl;
            expoStatus.webUrl = newTunnelUrl;
            hasFoundQR = true;
      // Cancel LAN fallback timer if running
      if (lanFallbackTimer) { clearTimeout(lanFallbackTimer); lanFallbackTimer = null; }
            log.log(`🚇 Tunnel URL (QR + Web + Universal): ${newTunnelUrl}`);
          }
        }

        // 🎯 STEP 2: Local web URL patterns (fallback if no tunnel)
        if (!expoStatus.tunnelUrl) {
          const webMatches = [
            output.match(/(?:Local|Web):\s+(https?:\/\/localhost:\d+)/i),
            output.match(/(?:Local|Web):\s+(https?:\/\/127\.0\.0\.1:\d+)/i),
            output.match(/Metro.*running.*https?:\/\/(localhost|127\.0\.0\.1):\d+/i),
            output.match(/(https?:\/\/localhost:\d+)/i)
          ].filter(Boolean);
          
          if (webMatches.length > 0 && webMatches[0]) {
            const newWebUrl = webMatches[0][1];
            if (newWebUrl !== expoStatus.webUrl) {
              expoStatus.webUrl = newWebUrl;
              log.log(`🌐 Local Web URL: ${newWebUrl}`);
            }
          }
        }

        // 🎯 STEP 3: LAN URL patterns (mobile device access)
        const lanMatches = [
          output.match(/(?:LAN|Network):\s+(https?:\/\/[\d\.]+:\d+)/i),
          output.match(/(https?:\/\/(?:192\.168|10\.0|172\.(?:1[6-9]|2[0-9]|3[01]))\.[\d\.]+:\d+)/i)
        ].filter(Boolean);
        
        if (lanMatches.length > 0 && lanMatches[0]) {
          const newLanUrl = lanMatches[0][1];
          if (newLanUrl !== expoStatus.lanUrl) {
            expoStatus.lanUrl = newLanUrl;
            log.log(`📱 LAN URL: ${newLanUrl}`);
            // Use LAN URL for QR only if no tunnel is available
            if (!expoStatus.tunnelUrl && !hasFoundQR) {
              expoStatus.qrUrl = newLanUrl;
              hasFoundQR = true;
              log.log(`📱 Using LAN URL for QR (no tunnel available): ${newLanUrl}`);
            }
          }
        }

        // 🎯 STEP 4: Enhanced QR Code Detection - Multiple patterns with tunnel priority
        const qrPatterns = [
          // Priority 1: Tunnel URLs (most important for Expo Go on physical devices)
          output.match(/tunnel\s+ready[\s\S]*?(exp:\/\/[^\s\n\r]+)/i),     // After "Tunnel ready"
          output.match(/tunnel[\s\S]*?(exp:\/\/[^\s\n\r]+)/i),             // Near "tunnel" text
          output.match(/(exp:\/\/[^\s\n\r]+\.ngrok\.io[^\s]*)/i),          // ngrok tunnel URLs
          output.match(/(exp:\/\/[^\s\n\r]+\.loca\.lt[^\s]*)/i),           // localtunnel URLs
          // Priority 2: Standard patterns
          output.match(/(exp:\/\/[^\s\n\r]+)/i),                           // exp:// protocol
          output.match(/(https?:\/\/[^\s]+\.expo\.dev[^\s]*)/i),           // .expo.dev domains
          output.match(/(https?:\/\/[^\s]+\.exp\.direct[^\s]*)/i),         // .exp.direct domains
          output.match(/QR.*?(https?:\/\/[^\s]+)/i),                       // Any URL after "QR"
          output.match(/scan.*?(https?:\/\/[^\s]+)/i),                     // Any URL after "scan"
          output.match(/(expo:\/\/[^\s]+)/i)                               // expo:// protocol
        ].filter(Boolean);
        
  if (qrPatterns.length > 0 && qrPatterns[0] && !expoStatus.tunnelUrl) {
          const newQrUrl = qrPatterns[0][1];
          if (newQrUrl !== expoStatus.qrUrl) {
            expoStatus.qrUrl = newQrUrl;
            hasFoundQR = true;
            log.log(`📱 Enhanced QR code detection: ${newQrUrl}`);
            
            // If it's a tunnel URL, also set it as tunnelUrl for reference
            if (newQrUrl.includes('exp://') && (newQrUrl.includes('ngrok') || newQrUrl.includes('loca.lt') || output.includes('tunnel'))) {
              expoStatus.tunnelUrl = newQrUrl;
              log.log(`🌐 Tunnel URL detected: ${newQrUrl}`);
            }
          }
        }

        // 🎯 STEP 4.5: Wait for tunnel URL in subsequent output if tunnel is ready but no URL yet
  if (output.includes('Tunnel ready') && !expoStatus.qrUrl && !expoStatus.tunnelUrl) {
          log.log(`⏳ Tunnel ready detected, waiting for tunnel URL in next output...`);
          tunnelReadyButNoUrl = true;
        }
        
        // If tunnel was ready but we didn't find URL, try harder to detect exp:// URLs
        if (tunnelReadyButNoUrl || output.includes('exp://')) {
          const expMatch = output.match(/(exp:\/\/[^\s\n\r\)]+)/i);
          if (expMatch) {
            const tunnelUrl = expMatch[1];
            expoStatus.qrUrl = tunnelUrl;
            expoStatus.tunnelUrl = tunnelUrl;
            hasFoundQR = true;
            tunnelReadyButNoUrl = false;
            if (lanFallbackTimer) { clearTimeout(lanFallbackTimer); lanFallbackTimer = null; }
            log.log(`🎯 Found tunnel URL after ready: ${tunnelUrl}`);
          }
        }

        // 🎯 STEP 5: Fallback QR generation - Use LAN URL if no specific QR found
  // Do not immediate-fallback to LAN here; a delayed timer above handles this to give tunnel time.

  // 🎯 STEP 6: Emergency QR generation
        // IMPORTANT: Never fall back to localhost for QR when tunnel mode is requested.
        if (!hasFoundQR && !expoStatus.qrUrl) {
          if (currentStartOptions.useTunnel) {
            // In tunnel mode, prefer LAN over localhost as a last resort, but as exp:// deep link
            if (expoStatus.lanUrl) {
              expoStatus.qrUrl = toExpUrl(expoStatus.lanUrl);
              hasFoundQR = true;
              log.log(`📱 Emergency QR (tunnel mode): Using Expo deep link ${expoStatus.qrUrl}`);
            } else {
              log.log("⏳ Waiting for tunnel URL; not falling back to localhost for QR.");
            }
          } else if (expoStatus.webUrl) {
            // Only in non-tunnel mode allow localhost as QR
            expoStatus.qrUrl = expoStatus.webUrl;
            hasFoundQR = true;
            log.log(`📱 Emergency QR (local mode): Using Web URL ${expoStatus.webUrl}`);
          }
        }

        // Log current status for debugging
        if (expoStatus.tunnelUrl) {
          log.log(`🎯 Tunnel mode active: Using tunnel ${expoStatus.tunnelUrl} for all access`);
        }
      });

  expoProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        log.warn("Expo Error:", output);
        expoStatus.terminalOutput += output;
      });

      expoProcess.on("close", (code: number) => {
        log.log(`Expo process closed with code: ${code}`);
        expoStatus.isRunning = false;
        expoProcess = null;
      });

      expoProcess.on("error", (error: Error) => {
        log.error("Expo process error:", error);
        expoStatus.isRunning = false;
        throw error;
      });

  // Wait a bit for initial output
  await new Promise(resolve => setTimeout(resolve, 3000));
      
  return { success: true, ...expoStatus };

    } catch (error: any) {
  log.error("Failed to start simple Expo:", error);
  expoStatus.isRunning = false;
  return { success: false, error: (error?.message ?? String(error)), ...expoStatus };
    }
  });

  // Get current status
  ipcMain.handle("simple-expo:status", async () => {
    return expoStatus;
  });

  // Stop Expo with aggressive port cleanup
  ipcMain.handle("simple-expo:stop", async () => {
    try {
      log.log("🛑 Stopping Expo with aggressive cleanup...");
      
      if (expoProcess) {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", expoProcess.pid!.toString(), "/f", "/t"]);
        } else {
          expoProcess.kill("SIGTERM");
        }
        expoProcess = null;
      }
      
      // AGGRESSIVE CLEANUP: Kill any process still using port 8081
      log.log("🔫 Aggressively cleaning port 8081...");
      await killProcessOnPort(8081);
      
      // Also kill common Metro/Expo processes by name
      if (process.platform === "win32") {
        try {
          spawn("taskkill", ["/f", "/im", "node.exe", "/fi", "WINDOWTITLE eq *expo*"], { shell: true });
          spawn("taskkill", ["/f", "/im", "node.exe", "/fi", "WINDOWTITLE eq *metro*"], { shell: true });
        } catch (e) {
          log.warn("Error killing Metro processes:", e);
        }
      }
      
      expoStatus = {
        isRunning: false,
        webUrl: "",
        qrUrl: "",
        lanUrl: "",
        tunnelUrl: "",
        terminalOutput: ""
      };
      
      log.log("✅ Expo stopped and port 8081 cleaned");
      return { success: true };
    } catch (error: any) {
      log.error("Failed to stop simple Expo:", error);
  return { success: false, error: (error?.message ?? String(error)) };
    }
  });

  // Send input/keystrokes to Expo CLI (e.g., 'w', 'r', 'j')
  ipcMain.handle("simple-expo:input", async (_evt, params: { input: string }) => {
    try {
      if (!expoProcess || expoProcess.killed) {
        return { success: false, error: "Expo process is not running" };
      }
      const input = params?.input ?? "";
      if (!input) {
        return { success: false, error: "No input provided" };
      }
      expoProcess.stdin?.write(input);
      // Mirror to terminal output for UX feedback
      expoStatus.terminalOutput += `\n> ${input.replace(/\n/g, "\\n").trim()}\n`;
      return { success: true };
    } catch (error: any) {
      log.error("Failed to send input to Expo:", error);
      return { success: false, error: error?.message ?? String(error) };
    }
  });

  // Diagnostic handler to check Node.js tools availability
  ipcMain.handle("simple-expo:check-tools", async () => {
    try {
      log.log("🔧 simple-expo:check-tools handler called");
      const availability = checkNodeToolsAvailability();
      log.log("🔧 Node.js tools check requested:", availability);
      return {
        success: true,
        availability,
      };
    } catch (error: any) {
      log.error("Failed to check Node.js tools:", error);
      return {
        success: false,
        error: error?.message ?? String(error),
        availability: null,
      };
    }
  });
  
  log.log("✅ All Expo IPC handlers registered successfully (simple-expo:start, simple-expo:stop, simple-expo:status, simple-expo:send-input, simple-expo:check-tools)");
}
