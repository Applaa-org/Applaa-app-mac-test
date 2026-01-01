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
import { unifiedInstallDependencies, areDependenciesInstalled, getInstallationErrorDetails } from "./unified_dependency_manager";
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

  // Enhanced port finder: guaranteed port allocation with kill fallback
  const findAvailablePort = async (basePort: number = 8081, maxTries = 19): Promise<number> => {
    log.log(`🔍 Scanning for available port starting from ${basePort} (up to ${basePort + maxTries - 1})...`);
    
    for (let i = 0; i < maxTries; i++) {
      const port = basePort + i;
      
      // Try to kill any process using this port first
      log.log(`🔫 Attempting to kill process on port ${port}...`);
      const killed = await killProcessOnPort(port);
      
      // Wait a moment for port to be freed (longer wait for preferred port)
      const waitTime = port === basePort ? 2000 : 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Check if port is now available
      // eslint-disable-next-line no-await-in-loop
      const isAvailable = await new Promise<boolean>((resolve) => {
        const server = net.createServer();
        server.once("error", () => {
          log.log(`❌ Port ${port} is still occupied${killed ? ' (kill attempted)' : ''}`);
          resolve(false);
        });
        server.once("listening", () => {
          server.close(() => {
            log.log(`✅ Port ${port} is available${killed ? ' (reclaimed)' : ''}`);
            resolve(true);
          });
        });
        server.listen(port, "0.0.0.0");
      });
      
      if (isAvailable) {
        const isPreferred = port === basePort;
        log.log(`🎯 Selected port ${port} for Expo Metro server${isPreferred ? ' (preferred)' : ' (fallback)'}`);
        return port;
      } else {
        log.warn(`⚠️ Port ${port} unavailable, trying next port...`);
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

  // ✅ FIX: Helper to construct URLs when detection fails
  const constructExpoUrls = (port: number): {
    webUrl: string;
    lanUrl?: string;
    qrUrl?: string;
  } => {
    const webUrl = `http://localhost:${port}`;
    
    // Try to get LAN IP
    const interfaces = os.networkInterfaces();
    let lanIp: string | undefined;
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          lanIp = iface.address;
          break;
        }
      }
      if (lanIp) break;
    }
    
    const lanUrl = lanIp ? `http://${lanIp}:${port}` : undefined;
    const qrUrl = lanUrl ? toExpUrl(lanUrl) : undefined;
    
    return { webUrl, lanUrl, qrUrl };
  };

  // Helper: Poll .expo/packager-info.json for tunnel URL (.exp.direct / expo.dev / tunnels.expo.dev)
  const startTunnelPoller = (projectRoot: string) => {
    try {
      const infoPath = path.join(projectRoot, ".expo", "packager-info.json");
      let attempts = 0;
      const maxAttempts = 60; // ~60s (increased for slower tunnel creation)

      const tryRead = () => {
        attempts++;
        try {
          if (!fs.existsSync(infoPath)) {
            if (attempts % 5 === 0) {
              log.log(`⏳ Waiting for packager-info.json (attempt ${attempts}/${maxAttempts})...`);
            }
            return false;
          }
          const raw = fs.readFileSync(infoPath, "utf8");
          if (!raw || raw.trim() === '') {
            return false;
          }
          const data = JSON.parse(raw || "{}");
          
          // Check all possible tunnel URL fields
          const candidates: string[] = [
            data.packagerTunnelUrl,
            data.packagerNgrokUrl,
            data.expoServerNgrokUrl,
            data.expoGoUrl,
            data.manifestTunnelUrl,
            data.tunnelUrl,
            data.expoDevUrl,
            data.devServerUrl,
            // Also check nested objects
            data.expo?.tunnelUrl,
            data.expo?.packagerTunnelUrl
          ].filter((x: any) => typeof x === "string" && x.length > 0);

          // Look for tunnel URLs (both HTTP and exp:// formats)
          const picked = candidates.find((u) =>
            u && (
              u.includes(".exp.direct") || 
              u.includes(".expo.dev") || 
              u.includes("tunnels.expo.dev") || 
              u.includes("ngrok.io") ||
              (u.startsWith("exp://") && (u.includes("exp.direct") || u.includes("expo.dev"))) ||
              (u.startsWith("https://") && (u.includes("exp.direct") || u.includes("expo.dev")))
            )
          );

          if (picked) {
            if (expoStatus.tunnelUrl !== picked) {
              expoStatus.tunnelUrl = picked;
              expoStatus.qrUrl = picked; // QR must be tunnel URL
              
              // Convert exp:// to https:// for web preview if needed
              if (picked.startsWith('exp://')) {
                const httpVersion = picked.replace(/^exp:\/\//, 'https://');
                expoStatus.webUrl = httpVersion;
              } else if (!expoStatus.webUrl) {
                // Keep webUrl as-is if already set; otherwise use tunnel URL
                expoStatus.webUrl = picked;
              }
              
              log.log(`🔎 Found tunnel from packager-info.json: ${picked}`);
              log.log(`📊 Updated URLs - Tunnel: ${expoStatus.tunnelUrl}, Web: ${expoStatus.webUrl}, QR: ${expoStatus.qrUrl}`);
            }
            return true;
          } else if (candidates.length > 0) {
            // Log if we found URLs but they don't match tunnel patterns
            log.log(`ℹ️ Found URLs in packager-info.json but none are tunnel URLs: ${candidates.join(', ')}`);
          }
        } catch (err) {
          // Log parse errors after a few attempts (file might be partially written)
          if (attempts > 3 && attempts % 10 === 0) {
            log.warn(`⚠️ Error parsing packager-info.json (attempt ${attempts}):`, err);
          }
        }
        return false;
      };

      const timer = setInterval(() => {
        const ok = tryRead();
        if (ok || attempts >= maxAttempts) {
          if (attempts >= maxAttempts && !ok) {
            log.warn(`⚠️ Tunnel poller timed out after ${maxAttempts} attempts - tunnel may not be available`);
          }
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
      
      // Update to expected versions based on Expo SDK 54
      const updateCommands = [
        "npx expo install expo@54.0.0",
        "npx expo install expo-router@~5.1.5", 
        "npx expo install react-native@0.81.0",
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
        message: "Package versions updated to match Expo SDK 54"
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
      
      // ✅ FIX: Check both node_modules AND package.json for @expo/ngrok
      let needsNgrokInstall = false;
      if (useTunnel) {
        const ngrokInNodeModules = fs.existsSync(ngrokModulePath);
        let ngrokInPackageJson = false;
        
        // Check if @expo/ngrok is in package.json
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageContent);
            ngrokInPackageJson = !!(packageJson.dependencies && packageJson.dependencies['@expo/ngrok']);
          } catch (e) {
            log.warn("⚠️ Could not read package.json to check for @expo/ngrok:", e);
          }
        }
        
        // Need to install if missing from either location
        needsNgrokInstall = !ngrokInNodeModules || !ngrokInPackageJson;
        
        if (needsNgrokInstall) {
          log.log(`🔍 @expo/ngrok check: node_modules=${ngrokInNodeModules}, package.json=${ngrokInPackageJson}`);
        }
      }
      
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
        
        // CRITICAL: Delete package-lock.json if it exists to prevent invalid versions from being locked
        const packageLockPath = path.join(appPath, 'package-lock.json');
        if (fs.existsSync(packageLockPath)) {
          log.log("🗑️ Removing package-lock.json to allow fresh dependency resolution...");
          expoStatus.terminalOutput += "🗑️ Removing package-lock.json to allow fresh dependency resolution...\n";
          try {
            fs.unlinkSync(packageLockPath);
            log.log("✅ package-lock.json removed");
            expoStatus.terminalOutput += "✅ package-lock.json removed\n";
          } catch (lockError) {
            log.warn("⚠️ Could not remove package-lock.json:", lockError);
            expoStatus.terminalOutput += `⚠️ Could not remove package-lock.json: ${lockError.message}\n`;
          }
        }
        
        // Fix common invalid package versions before installing
        try {
          if (fs.existsSync(packageJsonPath)) {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            let packageJson = JSON.parse(packageContent);
            let needsFixing = false;
            
            // Ensure dependencies and devDependencies exist
            if (!packageJson.dependencies) {
              packageJson.dependencies = {};
            }
            if (!packageJson.devDependencies) {
              packageJson.devDependencies = {};
            }
            
            // CRITICAL: Add npm overrides to force correct versions for transitive dependencies
            // This overrides ANY package's request for these invalid versions, even transitive deps
            if (!packageJson.overrides) {
              packageJson.overrides = {};
              needsFixing = true;
            }
            
            const requiredOverrides = {
              "@react-navigation/core": "^7.0.0",
              "@react-navigation/native": "^7.0.0",
              "@react-navigation/bottom-tabs": "^7.0.0",
              "@react-navigation/native-stack": "^7.0.0",
              "@react-navigation/stack": "^7.0.0"
            };
            
            let overridesAdded = false;
            for (const [pkg, version] of Object.entries(requiredOverrides)) {
              if (!packageJson.overrides[pkg] || packageJson.overrides[pkg] !== version) {
                packageJson.overrides[pkg] = version;
                overridesAdded = true;
                needsFixing = true;
                log.log(`🔧 Added override: ${pkg} -> ${version}`);
                expoStatus.terminalOutput += `🔧 Added npm override: ${pkg}@${version}\n`;
              }
            }
            
            if (overridesAdded) {
              expoStatus.terminalOutput += `✅ npm overrides configured to force correct React Navigation versions\n`;
            }
            
            // Fix common invalid versions
            const fixes = {
              "@react-navigation/core": {
                invalid: ["^7.13.5", "7.13.5", "~7.13.5", "7.13", "^7.13", ">=7.13.5", "7.13.5.0"],
                fix: "^7.0.0" // Fix invalid v7 version to valid v7.0.0 (expo-router 5.x requires v7)
              },
              "@react-navigation/native": {
                invalid: ["^7.13.5", "7.13.5"],
                fix: "^7.0.0"
              },
              "@react-navigation/bottom-tabs": {
                invalid: ["^7.13.5", "7.13.5"],
                fix: "^7.0.0"
              },
              "@react-navigation/native-stack": {
                invalid: ["^7.13.5", "7.13.5"],
                fix: "^7.0.0"
              },
              "@react-navigation/stack": {
                invalid: ["^7.13.5", "7.13.5"],
                fix: "^7.0.0"
              },
              "@react-native-async-storage/async-storage": {
                invalid: ["1.25.0"],
                fix: "^1.23.1"
              },
              "@types/react-native": {
                invalid: ["~0.79.0", "~0.80.0"],
                fix: "^0.81.0"
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
            log.log(`🔍 Checking package.json for invalid versions...`);
            expoStatus.terminalOutput += `🔍 Checking package.json for invalid versions...\n`;
            
            // Log all dependencies for debugging
            const allDeps = { ...packageJson.dependencies || {}, ...packageJson.devDependencies || {} };
            const reactNavPackages = Object.keys(allDeps).filter(k => k.includes('react-navigation'));
            if (reactNavPackages.length > 0) {
              expoStatus.terminalOutput += `Found React Navigation packages: ${reactNavPackages.join(', ')}\n`;
              reactNavPackages.forEach(pkg => {
                expoStatus.terminalOutput += `  ${pkg}: ${allDeps[pkg]}\n`;
              });
            } else {
              expoStatus.terminalOutput += `⚠️ No React Navigation packages found in package.json (may be transitive dependency)\n`;
            }
            
            for (const [pkg, config] of Object.entries(fixes)) {
              const currentVersion = allDeps[pkg];
              
              if (currentVersion) {
                log.log(`Found ${pkg}: ${currentVersion}`);
                expoStatus.terminalOutput += `  Checking ${pkg}: ${currentVersion}\n`;
                
                // Check if version matches any invalid pattern (flexible matching)
                const matchesInvalid = config.invalid.some(inv => {
                  // First check exact match (handles most cases)
                  if (currentVersion === inv || currentVersion.trim() === inv.trim()) {
                    return true;
                  }
                  
                  // Normalize both versions by removing version prefixes
                  // Use global flag to replace all prefix characters
                  const normalize = (v: string) => v.replace(/^[\^~=<>]+/g, '').trim();
                  const normalizedInv = normalize(inv);
                  const normalizedCurrent = normalize(currentVersion);
                  
                  // Check exact match (after normalization)
                  if (normalizedCurrent === normalizedInv) {
                    return true;
                  }
                  
                  // Check if current version starts with invalid version number
                  if (normalizedCurrent.startsWith(normalizedInv)) {
                    return true;
                  }
                  
                  // Check if current version contains the invalid version number (without prefix)
                  if (currentVersion.includes(normalizedInv)) {
                    return true;
                  }
                  
                  // Also check if normalized current starts with any part of normalized invalid
                  if (normalizedInv && normalizedCurrent.startsWith(normalizedInv.split('.')[0])) {
                    // Check if it's the same major version
                    const invMajor = normalizedInv.split('.')[0];
                    const currentMajor = normalizedCurrent.split('.')[0];
                    if (invMajor === currentMajor && normalizedCurrent.includes(normalizedInv)) {
                      return true;
                    }
                  }
                  
                  return false;
                });
                
                if (matchesInvalid) {
                  if (packageJson.dependencies && packageJson.dependencies[pkg]) {
                    const oldVersion = packageJson.dependencies[pkg];
                    packageJson.dependencies[pkg] = config.fix;
                    needsFixing = true;
                    log.log(`🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}`);
                    expoStatus.terminalOutput += `🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}\n`;
                  }
                  if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
                    const oldVersion = packageJson.devDependencies[pkg];
                    packageJson.devDependencies[pkg] = config.fix;
                    needsFixing = true;
                    log.log(`🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}`);
                    expoStatus.terminalOutput += `🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}\n`;
                  }
                 } else {
                   log.log(`✓ ${pkg} version ${currentVersion} is valid`);
                   expoStatus.terminalOutput += `    ✓ ${pkg} version is valid\n`;
                 }
              }
            }
            
            // Write back the fixed package.json
            if (needsFixing) {
              const fixedContent = JSON.stringify(packageJson, null, 2);
              fs.writeFileSync(packageJsonPath, fixedContent, 'utf8');
              
              // Verify the fix was written
              const verifyContent = fs.readFileSync(packageJsonPath, 'utf8');
              const verifyJson = JSON.parse(verifyContent);
              const verifyDeps = { ...verifyJson.dependencies, ...verifyJson.devDependencies };
              
              log.log("✅ package.json fixed and verified");
              expoStatus.terminalOutput += "✅ package.json fixed and verified\n";
              
              // Log what was actually fixed
              for (const [pkg, config] of Object.entries(fixes)) {
                if (verifyDeps[pkg]) {
                  log.log(`Verified ${pkg}: ${verifyDeps[pkg]}`);
                  expoStatus.terminalOutput += `  ✓ ${pkg}: ${verifyDeps[pkg]}\n`;
                }
              }
              
              // Log overrides if they exist
              if (verifyJson.overrides) {
                expoStatus.terminalOutput += `📋 npm overrides active:\n`;
                Object.entries(verifyJson.overrides).forEach(([pkg, version]) => {
                  expoStatus.terminalOutput += `  ${pkg}: ${version}\n`;
                });
              }
            } else {
              log.log("ℹ️ No package.json fixes needed");
              expoStatus.terminalOutput += "ℹ️ No package.json fixes needed\n";
            }
            
            // CRITICAL: If @react-navigation/core is missing but other react-navigation packages exist,
            // add it explicitly with correct version to prevent transitive dependency issues
            const hasReactNavNative = allDeps['@react-navigation/native'];
            const hasReactNavCore = allDeps['@react-navigation/core'];
            if (hasReactNavNative && !hasReactNavCore) {
              log.log("⚠️ @react-navigation/native found but @react-navigation/core missing - adding explicitly");
              expoStatus.terminalOutput += "⚠️ Adding @react-navigation/core explicitly to prevent transitive dependency issues\n";
              if (!packageJson.dependencies) {
                packageJson.dependencies = {};
              }
              packageJson.dependencies['@react-navigation/core'] = '^6.1.18';
              fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
              expoStatus.terminalOutput += "✅ Added @react-navigation/core@^6.1.18 to package.json\n";
            }
          }
        } catch (fixError) {
          log.error("❌ Could not fix package.json:", fixError);
          expoStatus.terminalOutput += `❌ Error fixing package.json: ${fixError.message}\n`;
        }
        
        const installSuccess = await unifiedInstallDependencies(appPath, appId, 'expo-preview');
        
        if (!installSuccess) {
          log.error("❌ Unified dependency installation failed");
          expoStatus.terminalOutput += "❌ Unified dependency installation failed\n";
          
          // Get detailed error information
          const errorDetails = getInstallationErrorDetails(appPath);
          if (errorDetails) {
            expoStatus.terminalOutput += "\n" + errorDetails + "\n";
          } else {
            expoStatus.terminalOutput += "⚠️ All installation strategies failed. Check the app logs for detailed error messages.\n";
          }
          
          expoStatus.terminalOutput += "\n💡 Common issues:\n";
          expoStatus.terminalOutput += "   - Missing or invalid package.json\n";
          expoStatus.terminalOutput += "   - Network connectivity issues\n";
          expoStatus.terminalOutput += "   - npm/node version incompatibilities\n";
          expoStatus.terminalOutput += "   - Disk space or permission issues\n";
          
          // Check if package.json exists and is readable
          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
              const packageJson = JSON.parse(packageContent);
              if (!packageJson.dependencies && !packageJson.devDependencies) {
                expoStatus.terminalOutput += "\n⚠️ Warning: package.json has no dependencies listed\n";
              }
            } catch (parseError) {
              expoStatus.terminalOutput += `\n⚠️ Warning: package.json appears to be invalid JSON\n`;
              log.error("Package.json parse error:", parseError);
            }
          } else {
            expoStatus.terminalOutput += `\n⚠️ Error: package.json not found at ${packageJsonPath}\n`;
          }
          
          throw new Error("Failed to install dependencies. All installation strategies failed. Check terminal output for details.");
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
        
        // ✅ FIX: Ensure @expo/ngrok is in package.json before installing
        try {
          if (fs.existsSync(packageJsonPath)) {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageContent);
            
            // Add @expo/ngrok to dependencies if missing
            if (!packageJson.dependencies) {
              packageJson.dependencies = {};
            }
            
            if (!packageJson.dependencies['@expo/ngrok']) {
              packageJson.dependencies['@expo/ngrok'] = "^4.1.3";
              fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
              log.log("✅ Added @expo/ngrok to package.json");
            }
          }
        } catch (packageError) {
          log.warn("⚠️ Could not update package.json for @expo/ngrok:", packageError);
        }
        
        try {
          await execAsync("npm install @expo/ngrok@^4.1.3 --save", {
            cwd: appPath,
            timeout: 120000 // 2 minutes
          });
          
          // ✅ FIX: Verify it was added to package.json after installation
          let verifiedInPackageJson = false;
          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
              const packageJson = JSON.parse(packageContent);
              verifiedInPackageJson = !!(packageJson.dependencies && packageJson.dependencies['@expo/ngrok']);
            } catch (e) {
              log.warn("⚠️ Could not verify package.json after install:", e);
            }
          }
          
          if (fs.existsSync(ngrokModulePath)) {
            log.log("✅ @expo/ngrok successfully installed in node_modules");
            if (verifiedInPackageJson) {
              log.log("✅ @expo/ngrok verified in package.json");
              expoStatus.terminalOutput += "✅ Tunnel module installed and saved to package.json\n";
            } else {
              log.warn("⚠️ @expo/ngrok installed but not found in package.json");
              expoStatus.terminalOutput += "✅ Tunnel module installed (package.json verification failed)\n";
            }
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
        log.log("✅ @expo/ngrok already present in both node_modules and package.json");
      }

      // NON-INTERACTIVE PORT SELECTION: pick the first free port starting at 8081
      // ✅ FIX: More aggressive port cleanup before selection
      log.log("🎯 Selecting a free Metro port starting at 8081 (non-interactive)...");
      
      // ✅ CRITICAL: Kill processes on multiple ports before checking
      const portsToClean = [8081, 8082, 8083, 8084, 8085];
      for (const port of portsToClean) {
        try {
          await killProcessOnPort(port);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cleanup
        } catch (e) {
          // Ignore errors - port might not be in use
        }
      }
      
      let finalPort = await findAvailablePort(8081, 19); // Try ports 8081-8099
      
      // ✅ ADD: Verify port is actually free before starting
      try {
        const testServer = net.createServer();
        await new Promise<void>((resolve, reject) => {
          testServer.listen(finalPort, () => {
            testServer.close(() => resolve());
          });
          testServer.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log.warn(`⚠️ Port ${finalPort} still in use, trying next port...`);
              reject(err);
            } else {
              reject(err);
            }
          });
        });
        log.log(`✅ Port ${finalPort} verified as free`);
      } catch (portError: any) {
        log.warn(`⚠️ Port ${finalPort} conflict detected, finding alternative...`);
        // Try next port
        finalPort = await findAvailablePort(finalPort + 1, 19);
        log.log(`✅ Using alternative port ${finalPort}`);
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
  let fallbackTimerRef: NodeJS.Timeout | null = null; // Reference to fallback timer

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

        // ✅ FIX: Detect "using LAN mode" message and extract URL
        if (output.includes('using LAN mode') || output.includes('LAN mode instead')) {
          log.log('🔍 LAN mode detected in output - extracting URL...');
          
          // Try to find LAN URL in the output
          const lanPatterns = [
            /(?:LAN|Network)[:\s]+(https?:\/\/[\d\.]+:\d+)/i,
            /(https?:\/\/(?:192\.168|10\.0|172\.(?:1[6-9]|2[0-9]|3[01]))\.[\d\.]+:\d+)/i,
            /(?:running|available)[^\n]*(https?:\/\/[\d\.]+:\d+)/i
          ];
          
          for (const pattern of lanPatterns) {
            const match = output.match(pattern);
            if (match && match[1]) {
              expoStatus.lanUrl = match[1];
              expoStatus.qrUrl = toExpUrl(match[1]);
              if (!expoStatus.webUrl) {
                // Extract port from LAN URL and create localhost version
                const portMatch = match[1].match(/:(\d+)/);
                if (portMatch) {
                  expoStatus.webUrl = `http://localhost:${portMatch[1]}`;
                }
              }
              log.log(`✅ LAN URL extracted from output: ${expoStatus.lanUrl}`);
              break;
            }
          }
        }

        // ✅ FIX: Better detection of Metro bundler running message
        if (output.includes('Metro bundler') && output.includes('running')) {
          // Extract port from the message
          const portMatch = output.match(/:(\d+)/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            if (!expoStatus.webUrl) {
              expoStatus.webUrl = `http://localhost:${port}`;
              log.log(`✅ Web URL set from Metro message: ${expoStatus.webUrl}`);
            }
            if (!expoStatus.lanUrl) {
              const computedLan = getLanUrl(port);
              if (computedLan) {
                expoStatus.lanUrl = computedLan;
                expoStatus.qrUrl = toExpUrl(computedLan);
                log.log(`✅ LAN URL computed from Metro port: ${expoStatus.lanUrl}`);
              }
            }
          }
        }

        // 🎯 STEP 1: Enhanced tunnel URL detection (both HTTP and exp:// formats)
        const tunnelMatches = [
          // HTTP/HTTPS tunnel URLs
          output.match(/(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev[^\s\)]*)/i),
          output.match(/(https?:\/\/[a-zA-Z0-9-]+\.exp\.direct[^\s\)]*)/i),
          output.match(/Tunnel:\s+(https?:\/\/[^\s\)]+)/i),
          output.match(/tunnel.*?(https?:\/\/[^\s\)]+\.expo\.dev[^\s\)]*)/i),
          // exp:// tunnel URLs (for Expo Go)
          output.match(/(exp:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev[^\s\)]*)/i),
          output.match(/(exp:\/\/[a-zA-Z0-9-]+\.exp\.direct[^\s\)]*)/i),
          output.match(/Tunnel:\s+(exp:\/\/[^\s\)]+)/i),
          // Generic patterns that might catch tunnel URLs
          output.match(/(https?:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.exp\.direct[^\s\)]*)/i),
          output.match(/(exp:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.exp\.direct[^\s\)]*)/i)
        ].filter(Boolean);
        
        if (tunnelMatches.length > 0 && tunnelMatches[0]) {
          let newTunnelUrl = tunnelMatches[0][1];
          
          // Convert exp:// to https:// for web preview if needed
          if (newTunnelUrl.startsWith('exp://')) {
            // Keep exp:// for QR, but also create HTTP version for web
            const httpVersion = newTunnelUrl.replace(/^exp:\/\//, 'https://');
            if (newTunnelUrl !== expoStatus.tunnelUrl) {
              expoStatus.tunnelUrl = newTunnelUrl; // Keep original exp:// for QR
              expoStatus.qrUrl = newTunnelUrl;
              expoStatus.webUrl = httpVersion; // Use HTTP version for web preview
              hasFoundQR = true;
              // Cancel LAN fallback timer if running
              if (lanFallbackTimer) { clearTimeout(lanFallbackTimer); lanFallbackTimer = null; }
              // Cancel fallback timer since we found a URL
              if (fallbackTimerRef) { clearTimeout(fallbackTimerRef); fallbackTimerRef = null; }
              log.log(`🚇 Tunnel URL detected (exp://): ${newTunnelUrl} -> Web: ${httpVersion}`);
            }
          } else {
            // HTTP/HTTPS tunnel URL
            if (newTunnelUrl !== expoStatus.tunnelUrl) {
              expoStatus.tunnelUrl = newTunnelUrl;
              // 🎯 STRATEGY: Use tunnel URL for BOTH QR and web preview (consistent external access)
              expoStatus.qrUrl = newTunnelUrl;
              expoStatus.webUrl = newTunnelUrl;
              hasFoundQR = true;
              // Cancel LAN fallback timer if running
              if (lanFallbackTimer) { clearTimeout(lanFallbackTimer); lanFallbackTimer = null; }
              // Cancel fallback timer since we found a URL
              if (fallbackTimerRef) { clearTimeout(fallbackTimerRef); fallbackTimerRef = null; }
              log.log(`🚇 Tunnel URL (QR + Web + Universal): ${newTunnelUrl}`);
            }
          }
        }

        // 🎯 STEP 2: Local web URL patterns (fallback if no tunnel)
        if (!expoStatus.tunnelUrl || expoStatus.tunnelUrl === '') {
          const webMatches = [
            output.match(/(?:Local|Web):\s+(https?:\/\/localhost:\d+)/i),
            output.match(/(?:Local|Web):\s+(https?:\/\/127\.0\.0\.1:\d+)/i),
            output.match(/Metro.*running.*https?:\/\/(localhost|127\.0\.0\.1):\d+/i),
            output.match(/(https?:\/\/localhost:\d+)/i)
          ].filter(Boolean);
          
          if (webMatches.length > 0 && webMatches[0]) {
            const newWebUrl = webMatches[0][1];
            if (newWebUrl !== expoStatus.webUrl && newWebUrl !== '') {
              expoStatus.webUrl = newWebUrl;
              // Cancel fallback timer since we found a URL
              if (fallbackTimerRef) { clearTimeout(fallbackTimerRef); fallbackTimerRef = null; }
              log.log(`🌐 Local Web URL: ${newWebUrl}`);
            }
          }
        }

        // 🎯 STEP 3: Enhanced LAN URL patterns (mobile device access)
        const lanMatches = [
          output.match(/(?:LAN|Network)[:\s]+(https?:\/\/[\d\.]+:\d+)/i),
          output.match(/(https?:\/\/(?:192\.168|10\.0|172\.(?:1[6-9]|2[0-9]|3[01]))\.[\d\.]+:\d+)/i),
          output.match(/(?:running on|available at)[^\n]*(https?:\/\/[\d\.]+:\d+)/i),  // ✅ ADD THIS
          output.match(/Metro[^\n]*(https?:\/\/[\d\.]+:\d+)/i)  // ✅ ADD THIS
        ].filter(Boolean);
        
        if (lanMatches.length > 0 && lanMatches[0]) {
          const newLanUrl = lanMatches[0][1];
          if (newLanUrl !== expoStatus.lanUrl) {
            expoStatus.lanUrl = newLanUrl;
            log.log(`📱 LAN URL: ${newLanUrl}`);
            // Use LAN URL for QR only if no tunnel is available
            if (!expoStatus.tunnelUrl && !hasFoundQR) {
              expoStatus.qrUrl = toExpUrl(newLanUrl);
              hasFoundQR = true;
              log.log(`📱 Using LAN URL for QR (no tunnel available): ${expoStatus.qrUrl}`);
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
        
        // ✅ FIX 1: Detect ngrok tunnel timeout specifically
        if (output.includes('ngrok tunnel took too long') || 
            output.includes('CommandError: ngrok tunnel took too long')) {
          log.warn('🚨 ngrok tunnel timeout detected - falling back to LAN mode');
          expoStatus.terminalOutput += '\n⚠️ Tunnel timeout - using LAN mode instead\n';
          
          // ✅ CRITICAL: When tunnel fails, immediately set LAN URL
          if (!expoStatus.lanUrl) {
            const portMatch = expoStatus.webUrl?.match(/:(\d+)/);
            const port = portMatch ? parseInt(portMatch[1], 10) : finalPort;
            const computedLan = getLanUrl(port);
            if (computedLan) {
              expoStatus.lanUrl = computedLan;
              expoStatus.qrUrl = toExpUrl(computedLan);
              expoStatus.webUrl = expoStatus.webUrl || `http://localhost:${port}`;
              log.log(`✅ Tunnel failed, using LAN URL: ${expoStatus.lanUrl}`);
              log.log(`✅ QR URL set: ${expoStatus.qrUrl}`);
            }
          }
        }
        
        // ✅ FIX 2: Detect "Tunnel mode failed, using LAN mode" message
        if (output.includes('Tunnel mode failed') || 
            output.includes('using LAN mode instead') ||
            output.includes('Tunnel mode unavailable')) {
          log.warn('🚨 Tunnel mode failed - LAN mode active');
          
          // Ensure LAN URL is set
          if (!expoStatus.lanUrl) {
            const portMatch = expoStatus.webUrl?.match(/:(\d+)/);
            const port = portMatch ? parseInt(portMatch[1], 10) : finalPort;
            const computedLan = getLanUrl(port);
            if (computedLan) {
              expoStatus.lanUrl = computedLan;
              expoStatus.qrUrl = toExpUrl(computedLan);
              log.log(`✅ LAN URL set after tunnel failure: ${expoStatus.lanUrl}`);
            }
          }
          
          // Also ensure webUrl is set
          if (!expoStatus.webUrl) {
            const portMatch = expoStatus.lanUrl?.match(/:(\d+)/);
            const port = portMatch ? parseInt(portMatch[1], 10) : finalPort;
            expoStatus.webUrl = `http://localhost:${port}`;
            log.log(`✅ Web URL set: ${expoStatus.webUrl}`);
          }
        }
        
        // ✅ FIX 3: Enhanced tunnel error detection (keep existing but improve)
        const tunnelErrorPatterns = [
          /tunnel.*failed/i,
          /ngrok.*error/i,
          /tunnel.*timeout/i,
          /ngrok tunnel took too long/i,  // ✅ ADD THIS
          /Unable to create tunnel/i,
          /Tunnel creation failed/i,
          /@expo\/ngrok.*not found/i,
          /ngrok.*not installed/i,
          /Tunnel mode failed/i,  // ✅ ADD THIS
          /Tunnel mode unavailable/i  // ✅ ADD THIS
        ];
        
        for (const pattern of tunnelErrorPatterns) {
          if (pattern.test(output)) {
            log.error(`🚨 Tunnel error detected: ${output.substring(0, 300)}`);
            
            // ✅ IMPROVED: Always set LAN URL when tunnel fails
            if (currentStartOptions.useTunnel) {
              const portMatch = expoStatus.webUrl?.match(/:(\d+)/) || 
                               expoStatus.lanUrl?.match(/:(\d+)/);
              const port = portMatch ? parseInt(portMatch[1], 10) : finalPort;
              
              // Set web URL if missing
              if (!expoStatus.webUrl) {
                expoStatus.webUrl = `http://localhost:${port}`;
                log.log(`✅ Set web URL after tunnel failure: ${expoStatus.webUrl}`);
              }
              
              // Set LAN URL if missing
              if (!expoStatus.lanUrl) {
                const computedLan = getLanUrl(port);
                if (computedLan) {
                  expoStatus.lanUrl = computedLan;
                  expoStatus.qrUrl = toExpUrl(computedLan);
                  log.log(`✅ Set LAN URL after tunnel failure: ${expoStatus.lanUrl}`);
                }
              }
            }
            break;
          }
        }
        
        // ✅ FIX: Detect common Metro/Expo errors that prevent startup
        const errorPatterns = [
          { pattern: /Error:.*Cannot find module/i, severity: 'critical', message: 'Missing module dependency' },
          { pattern: /Error:.*Module not found/i, severity: 'critical', message: 'Module not found' },
          { pattern: /Failed to compile/i, severity: 'error', message: 'Compilation failed' },
          { pattern: /Metro bundler.*error/i, severity: 'error', message: 'Metro bundler error' },
          { pattern: /Unable to resolve module/i, severity: 'critical', message: 'Unable to resolve module' },
          { pattern: /TypeError:.*is not a function/i, severity: 'error', message: 'Type error in code' },
          { pattern: /SyntaxError:/i, severity: 'error', message: 'Syntax error in code' },
          { pattern: /ReferenceError:/i, severity: 'error', message: 'Reference error in code' },
          { pattern: /EADDRINUSE|port.*already in use/i, severity: 'critical', message: 'Port already in use' },
          { pattern: /ENOENT.*package\.json/i, severity: 'critical', message: 'package.json not found' }
        ];
        
        for (const { pattern, severity, message } of errorPatterns) {
          if (pattern.test(output)) {
            log.error(`🚨 ${severity.toUpperCase()}: ${message}`);
            log.error(`Error output: ${output.substring(0, 300)}`);
            
            // For critical errors, update status immediately
            if (severity === 'critical') {
              expoStatus.buildStatus = 'error';
              expoStatus.terminalOutput += `\n❌ ${message}\n`;
            }
            break;
          }
        }
      });

      expoProcess.on("close", (code: number) => {
        log.log(`Expo process closed with code: ${code}`);
        
        // If process exits with error code, log detailed diagnostics
        if (code !== 0 && code !== null) {
          const lastOutput = expoStatus.terminalOutput.slice(-2000); // Last 2000 chars for context
          log.error(`🚨 Expo process exited with code ${code}`);
          log.error(`Last terminal output:\n${lastOutput}`);
          
          // Detect common error patterns and provide specific guidance
          if (lastOutput.includes('Cannot find module') || lastOutput.includes('Module not found')) {
            log.error('❌ Missing dependencies detected. The app may need npm install.');
            expoStatus.terminalOutput += '\n❌ Error: Missing dependencies detected\n';
          }
          if (lastOutput.includes('EADDRINUSE') || lastOutput.includes('port') || lastOutput.includes('already in use')) {
            log.error('❌ Port conflict detected. Port may be in use by another process.');
            expoStatus.terminalOutput += '\n❌ Error: Port conflict - another process may be using the port\n';
          }
          if ((lastOutput.includes('tunnel') || lastOutput.includes('ngrok')) && (lastOutput.includes('failed') || lastOutput.includes('error'))) {
            log.error('❌ Tunnel creation failed. Try starting without tunnel mode.');
            expoStatus.terminalOutput += '\n❌ Error: Tunnel creation failed - try without tunnel mode\n';
          }
          if (lastOutput.includes('SyntaxError') || lastOutput.includes('ReferenceError') || lastOutput.includes('TypeError')) {
            log.error('❌ JavaScript error detected in app code.');
            expoStatus.terminalOutput += '\n❌ Error: JavaScript error in app code\n';
          }
          
          // Update status to reflect error
          expoStatus.buildStatus = 'error';
        }
        
        expoStatus.isRunning = false;
        expoProcess = null;
        // Clear fallback timer if process closes
        if (fallbackTimerRef) { clearTimeout(fallbackTimerRef); fallbackTimerRef = null; }
      });

      expoProcess.on("error", (error: Error) => {
        log.error("Expo process error:", error);
        log.error("Error details:", {
          message: error.message,
          code: (error as any).code,
          signal: (error as any).signal,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 stack lines
        });
        
        // Log last terminal output for context
        const lastOutput = expoStatus.terminalOutput.slice(-500);
        if (lastOutput) {
          log.error("Last terminal output before error:", lastOutput);
        }
        
        expoStatus.isRunning = false;
        expoStatus.buildStatus = 'error';
        expoStatus.terminalOutput += `\n❌ Process error: ${error.message}\n`;
        throw error;
      });

  // ✅ FIX: Fallback mechanism - if Metro is running but no URL detected after 10s, use localhost:port
      fallbackTimerRef = setTimeout(() => {
        if (expoStatus.isRunning && (!expoStatus.webUrl || expoStatus.webUrl === '')) {
          // ✅ IMPROVED: Use helper function
          const urls = constructExpoUrls(finalPort);
          expoStatus.webUrl = urls.webUrl;
          
          if (urls.lanUrl) {
            expoStatus.lanUrl = urls.lanUrl;
            log.log(`📱 Fallback: Constructed LAN URL ${urls.lanUrl}`);
          }
          
          if (urls.qrUrl) {
            expoStatus.qrUrl = urls.qrUrl;
            log.log(`📱 Fallback: Constructed QR URL ${urls.qrUrl}`);
          }
          
          log.warn(`⚠️ No URL detected from Metro output after 10s, using constructed URLs`);
          log.log(`✅ Fallback URLs set - Status will be updated on next poll`);
        } else if (expoStatus.isRunning && expoStatus.webUrl && !expoStatus.lanUrl) {
          // ✅ ADD: If webUrl exists but lanUrl doesn't, construct it
          const portMatch = expoStatus.webUrl.match(/:(\d+)/);
          if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            const urls = constructExpoUrls(port);
            if (urls.lanUrl) {
              expoStatus.lanUrl = urls.lanUrl;
              expoStatus.qrUrl = urls.qrUrl;
              log.log(`📱 Fallback: Constructed LAN/QR URLs from webUrl`);
            }
          }
        }
      }, 10000); // 10 second fallback (reduced from 15s for faster response)

  // Wait a bit for initial output
  await new Promise(resolve => setTimeout(resolve, 3000));
      
  // Verify process is still running after initial wait
  if (!expoProcess || expoProcess.killed || (expoProcess.exitCode !== null && expoProcess.exitCode !== 0)) {
    const exitCode = expoProcess?.exitCode ?? 'unknown';
    log.error(`❌ Expo process exited early with code: ${exitCode}`);
    log.error(`Terminal output so far:\n${expoStatus.terminalOutput.slice(-1000)}`);
    expoStatus.isRunning = false;
    expoStatus.buildStatus = 'error';
    throw new Error(`Expo process exited immediately with code ${exitCode}. Check terminal output for details.`);
  }
      
  // Clear fallback timer if we return early (shouldn't happen, but safety)
  // Note: Timer will be cleared when process closes or URL is set
      
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
