import { ipcMain, app } from "electron";
import { spawn } from "child_process";
import os from "os";
import { startProxy } from "../utils/start_proxy_server";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

interface ExpoStatus {
  isRunning: boolean;
  webUrl: string;
  lanUrl: string;
  tunnelUrl: string;
  qrUrl: string;
}

let expoProcess: any = null;
let expoStatus: ExpoStatus = {
  isRunning: false,
  webUrl: "",
  lanUrl: "",
  tunnelUrl: "",
  qrUrl: ""
};

export function registerExpoHandlers() {
  ipcMain.handle("expo:start", async (
    _,
    params: { appId: number; useTunnel?: boolean; native?: boolean },
  ) => {
    try {
      const { appId, useTunnel = true, native = true } = params;

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
        } catch (e) {
          log.warn("Error stopping existing Expo process:", e);
        }
        expoProcess = null;
        expoStatus = {
          isRunning: false,
          webUrl: "",
          lanUrl: "",
          tunnelUrl: "",
          qrUrl: ""
        };
        // Wait a moment for process cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
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
        qrUrl: ""
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

      // For mobile apps, always check/install dependencies
      if (isMobileApp && (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, 'expo')))) {
        log.log("Mobile app detected, installing dependencies...");
        
        // Install dependencies first
        const installProcess = spawn("npm", ["install", "--force"], {
          cwd: appPath,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        await new Promise((resolve, reject) => {
          installProcess.on('close', (code) => {
            if (code === 0) {
              log.log("Dependencies installed successfully");
              resolve(true);
            } else {
              log.error(`npm install failed with code ${code}`);
              reject(new Error(`Failed to install dependencies: exit code ${code}`));
            }
          });

          installProcess.on('error', (error) => {
            log.error("npm install error:", error);
            reject(error);
          });

          installProcess.stdout?.on('data', (data) => {
            log.log("npm install stdout:", data.toString());
          });

          installProcess.stderr?.on('data', (data) => {
            log.warn("npm install stderr:", data.toString());
          });
        });
      }

      // Ensure TypeScript web support when project uses TS
      try {
        const tsconfigExists = fs.existsSync(path.join(appPath, 'tsconfig.json')) || fs.existsSync(path.join(appPath, 'tsconfig.app.json'));
        if (tsconfigExists) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const hasTypesReact = Boolean(pkg.devDependencies?.['@types/react'] || pkg.dependencies?.['@types/react']);
          if (!hasTypesReact) {
            log.log('Installing @types/react for TypeScript web support');
            // Choose package manager by lockfile
            let manager = 'npm';
            if (fs.existsSync(path.join(appPath, 'pnpm-lock.yaml'))) manager = 'pnpm';
            else if (fs.existsSync(path.join(appPath, 'yarn.lock'))) manager = 'yarn';

            const args = manager === 'npm'
              ? ['install', '-D', '@types/react@~19.0.10']
              : manager === 'pnpm'
              ? ['add', '-D', '@types/react@~19.0.10']
              : ['add', '-D', '@types/react@~19.0.10'];

            await new Promise((resolve, reject) => {
              const p = spawn(manager, args, { cwd: appPath, shell: true, stdio: ['pipe','pipe','pipe'] });
              p.on('close', (code: number) => {
                if (code === 0) resolve(true);
                else reject(new Error(`${manager} ${args.join(' ')} exited with ${code}`));
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

      const expoArgs = native ? ["start", "--clear"] : ["start", "--web", "--clear"];
      if (useTunnel) {
        expoArgs.push("--tunnel");
      }

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
              EXPO_NO_DOCTOR: '1', // Skip health checks that might fail
              EXPO_NO_UPDATE_CHECK: '1', // Skip update checks
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

      // Handle process output
      expoProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        log.log("Expo stdout:", output);

        // Extract URLs from output with more robust patterns
        const webUrlPatterns = [
          /Metro.*?running.*?(https?:\/\/localhost:\d+)/i,
          /Development server.*?(https?:\/\/localhost:\d+)/i,
          /Web.*?(https?:\/\/localhost:\d+)/i,
          /Local.*?(https?:\/\/localhost:\d+)/i,
          /(https?:\/\/localhost:\d+)/i,
        ];

        const lanUrlPatterns = [
          /(exp:\/\/\d+\.\d+\.\d+\.\d+:\d+)/i,
          /(http:\/\/\d+\.\d+\.\d+\.\d+:\d+)/i,
        ];

        const tunnelUrlPatterns = [
          /(exp:\/\/[a-zA-Z0-9.-]+:\d+)/i,
          /(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.dev\/?)/i,
          /(https?:\/\/[a-zA-Z0-9-]+\.tunnels\.expo\.io\/?)/i,
          /(https?:\/\/[a-zA-Z0-9-]+\.ngrok\.io\/?)/i,
        ];

        // Web URL for iframe (web mode only)
        for (const pattern of webUrlPatterns) {
          const match = output.match(pattern);
          if (!native && match && match[1] && !expoStatus.webUrl) {
            expoStatus.webUrl = match[1];
            log.log(`Found web URL: ${expoStatus.webUrl}`);
            // Start a lightweight proxy to strip frame-busting headers for iframe embedding
            if (!proxyWorker) {
              try {
                proxyWorker = startProxy(expoStatus.webUrl, {
                  onStarted: (proxyUrl: string) => {
                    log.log(`Using proxied web URL for iframe: ${proxyUrl}`);
                    expoStatus.webUrl = proxyUrl;
                  },
                });
              } catch (e) {
                log.warn("Failed to start proxy for Expo web URL:", e);
              }
            }
            break;
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

        // Tunnel URL (when enabled)
        for (const pattern of tunnelUrlPatterns) {
          const match = output.match(pattern);
          if (match && match[1] && !expoStatus.tunnelUrl) {
            expoStatus.tunnelUrl = match[1];
            if (params.useTunnel) {
              expoStatus.qrUrl = match[1];
            }
            log.log(`Found tunnel URL: ${expoStatus.tunnelUrl}`);
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
              if (!params.useTunnel) {
                expoStatus.qrUrl = expoStatus.lanUrl;
              }
              log.log(`Synthesized LAN URL: ${expoStatus.lanUrl}`);
            }
          }
        }
      });

      expoProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        log.warn("Expo stderr:", output);
      });

      expoProcess.on("close", (code: number | null) => {
        log.log(`Expo process exited with code ${code}`);
        expoProcess = null;
        expoStatus = {
          isRunning: false,
          webUrl: "",
          lanUrl: "",
          tunnelUrl: "",
          qrUrl: ""
        };
        
        // If the process exited unexpectedly (not code 0), just log it
        if (code !== 0 && code !== null) {
          log.error(`Expo server crashed with code ${code}. User will need to manually restart.`);
        }
      });

      expoProcess.on("error", (error: Error) => {
        log.error("Expo process error:", error);
        expoProcess = null;
        expoStatus.isRunning = false;
      });

      // Set fallback web URL after 8 seconds if not detected (longer for dependency install)
      setTimeout(() => {
        if (expoStatus.isRunning && !expoStatus.webUrl) {
          // Use detected port or common Expo ports as fallback
          const fallbackPort = detectedPort || "8081"; // 8081 is more common than 19006
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
          // Also start proxy for embedding if not already (web mode only)
          if (!native && expoStatus.webUrl && !proxyWorker) {
            try {
              proxyWorker = startProxy(expoStatus.webUrl, {
                onStarted: (proxyUrl: string) => {
                  log.log(`Using proxied web URL for iframe: ${proxyUrl}`);
                  expoStatus.webUrl = proxyUrl;
                },
              });
            } catch (e) {
              log.warn("Failed to start proxy for Expo web URL:", e);
            }
          }
        }
      }, 8000);

      log.log("Expo dev server started successfully");
      return expoStatus;

    } catch (error) {
      log.error("Failed to start Expo:", error);
      expoStatus.isRunning = false;
      throw error;
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
        qrUrl: ""
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
      const response = await fetch(expoStatus.webUrl, { timeout: 3000 });
      const healthy = response.ok;
      log.log(`Health check for ${expoStatus.webUrl}: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return { 
        healthy, 
        reason: healthy ? 'Server responding' : `HTTP ${response.status}`,
        url: expoStatus.webUrl
      };
    } catch (error) {
      log.warn(`Health check failed for ${expoStatus.webUrl}:`, error);
      return { 
        healthy: false, 
        reason: `Connection failed: ${(error as Error).message}`,
        url: expoStatus.webUrl
      };
    }
  });

}