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
import log from "electron-log";

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
  log.log("🎯 Registering RORK-style Expo handlers with guaranteed port allocation");

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

  // Enhanced port finder: RORK-style guaranteed port allocation
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

      // ALWAYS kill any process using port 8081 before starting (RORK-style dedication)
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

      // RORK-style port pre-allocation with aggressive cleanup
      log.log("🎯 Ensuring port 8081 is available for Applaa...");
      const metroPort = await findAvailablePort(8081);
      
      // If port 8081 is not available, kill whatever is using it
      if (metroPort !== 8081) {
        log.log("🔫 Port 8081 occupied, killing process and reclaiming...");
        await killProcessOnPort(8081);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify port 8081 is now free
        const retryPort = await findAvailablePort(8081, 1);
        if (retryPort === 8081) {
          log.log("🎉 Successfully reclaimed port 8081 for Applaa!");
        } else {
          log.warn("⚠️ Could not reclaim port 8081, using alternative port");
        }
      }
      
      const finalPort = 8081; // Always try to use 8081 for RORK-style consistency
      log.log(`🎯 RORK-style port allocation: Metro will use port ${finalPort}`);
      
      const portMessage = `Using port ${finalPort} (RORK-style dedicated allocation)\n`;
      expoStatus.terminalOutput += portMessage;
      log.log(`✅ ${portMessage.trim()}`);

      // Build command: RORK-style with SUPPORTED anti-interactive flags only
      const args = [
        "expo", "start", 
        "--clear",
        "--web",
        `--port=${finalPort}`        // 🎯 Explicit port prevents "Use port 8082 instead?" prompt
        // Removed unsupported flags: --non-interactive, --no-install, --offline, --minify
        // Using environment variables instead (CI=1, etc.)
      ];
      
      // RORK uses tunnel by default for consistent external access
      if (useTunnel) {
        args.push("--tunnel");
        log.log("🚇 Using tunnel mode (RORK-style for consistent access)");
      } else {
        args.push("--localhost");
        log.log("🏠 Using localhost mode");
      }

      log.log(`🚀 RORK-style startup: npx ${args.join(" ")}`);

    // Start Expo process with minimal environment to preserve default CLI behavior (prints QR)
  expoProcess = spawn("npx", args, {
        cwd: appPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
      EXPO_NO_TELEMETRY: '1',              // Reduce noise
      EXPO_USE_DEV_SERVER: '1',            // Enable dev server
          NODE_ENV: 'development',
          // Metro server configuration
          RCT_METRO_PORT: String(finalPort),   // Explicit Metro port
          REACT_NATIVE_PACKAGER_HOSTNAME: '0.0.0.0',
          // Additional non-interactive safeguards
      EXPO_NO_DOTENV: '1',                 // Skip .env prompts
      EXPO_NO_GIT_STATUS: '1',             // Skip git status checks
      EXPO_NO_CACHE: '1',                  // Prevent cache prompts
      EXPO_NO_UPDATE_CHECK: '1',           // Skip update checks
          // Port allocation (RORK-style)
          PORT: String(finalPort),             // Backup port env var
          EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      // 🚀 Keep CLI mostly default so it prints QR (no CI / no EXPO_NO_INTERACTIVE)
      EXPO_NO_WEB_SETUP: '1',             // Skip web setup prompts
      EXPO_NO_TYPESCRIPT_SETUP: '1',      // Skip TypeScript setup prompts  
      EXPO_NO_ANALYTICS: '1',             // Disable analytics prompts
      EXPO_NO_REDIRECT: '1',              // Disable redirect prompts
          REACT_NATIVE_METRO_PORT: String(finalPort), // Additional Metro port specification
          // Force specific behaviors
      EXPO_AUTO_PORT: '0',                // Disable auto port selection prompts
      EXPO_FORCE_PORT: String(finalPort)  // Force specific port
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

      // RORK-style output parsing: prioritize tunnel URLs for consistent access
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
            // 🎯 RORK STRATEGY: Use tunnel URL for BOTH QR and web preview (consistent external access)
            expoStatus.qrUrl = newTunnelUrl;
            expoStatus.webUrl = newTunnelUrl;
            hasFoundQR = true;
      // Cancel LAN fallback timer if running
      if (lanFallbackTimer) { clearTimeout(lanFallbackTimer); lanFallbackTimer = null; }
            log.log(`🚇 RORK-style tunnel URL (QR + Web + Universal): ${newTunnelUrl}`);
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
          log.log(`🎯 RORK-mode active: Using tunnel ${expoStatus.tunnelUrl} for all access`);
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
}
