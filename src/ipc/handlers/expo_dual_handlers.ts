import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import fs from "fs";
import path from "path";

interface ExpoProcess {
  process: ChildProcess;
  type: 'web' | 'tunnel';
  port?: number;
  url?: string;
  pid: number;
}

interface DualExpoStatus {
  isRunning: boolean;
  webProcess?: ExpoProcess;
  tunnelProcess?: ExpoProcess;
  webUrl?: string;
  tunnelUrl?: string;
  lanUrl?: string;
  qrUrl?: string;
  lastUpdate: number;
  buildStatus: 'idle' | 'building' | 'success' | 'error';
  buildProgress?: string;
}

// Store processes per app
const expoProcesses = new Map<number, DualExpoStatus>();

// Find available port starting from a base port
async function findAvailablePort(basePort: number): Promise<number> {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(basePort, () => {
      const port = server.address()?.port;
      server.close(() => {
        resolve(port || basePort);
      });
    });
    
    server.on('error', () => {
      // Port is busy, try next one
      findAvailablePort(basePort + 1).then(resolve);
    });
  });
}

// Kill all processes for an app
async function killExpoProcesses(appId: number): Promise<void> {
  const status = expoProcesses.get(appId);
  if (!status) return;

  log.log(`🛑 Killing all Expo processes for app ${appId}`);

  // Kill web process
  if (status.webProcess?.process) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", status.webProcess.process.pid!.toString(), "/f", "/t"]);
      } else {
        status.webProcess.process.kill("SIGTERM");
      }
    } catch (e) {
      log.warn("Error killing web process:", e);
    }
  }

  // Kill tunnel process
  if (status.tunnelProcess?.process) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", status.tunnelProcess.process.pid!.toString(), "/f", "/t"]);
      } else {
        status.tunnelProcess.process.kill("SIGTERM");
      }
    } catch (e) {
      log.warn("Error killing tunnel process:", e);
    }
  }

  // Clear from map
  expoProcesses.delete(appId);
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Start web-only Expo process
async function startWebProcess(appId: number, appPath: string): Promise<ExpoProcess | null> {
  try {
    const webPort = await findAvailablePort(8081);
    log.log(`🌐 Starting Expo web process on port ${webPort} for app ${appId}`);

    const webProcess = spawn("npx", ["expo", "start", "--web-only", "--port", webPort.toString(), "--clear"], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_DOCTOR: '1',
        EXPO_NO_UPDATE_CHECK: '1',
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_INTERACTIVE: '1',
        FORCE_COLOR: '0',
        PORT: webPort.toString()
      }
    });

    if (!webProcess.pid) {
      throw new Error("Failed to start web process");
    }

    const expoWebProcess: ExpoProcess = {
      process: webProcess,
      type: 'web',
      port: webPort,
      url: `http://localhost:${webPort}`,
      pid: webProcess.pid
    };

    // Handle web process output
    webProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      log.log(`[Web ${appId}] ${output.trim()}`);
      
      // Update status when web server is ready
      if (output.includes('webpack compiled') || output.includes('Local:')) {
        const status = expoProcesses.get(appId);
        if (status) {
          status.webUrl = `http://localhost:${webPort}`;
          status.buildStatus = 'success';
          status.lastUpdate = Date.now();
        }
      }
    });

    webProcess.stderr?.on('data', (data) => {
      log.warn(`[Web ${appId} Error] ${data.toString().trim()}`);
    });

    webProcess.on('exit', (code) => {
      log.log(`[Web ${appId}] Process exited with code ${code}`);
      const status = expoProcesses.get(appId);
      if (status) {
        status.webProcess = undefined;
        status.webUrl = undefined;
      }
    });

    return expoWebProcess;
  } catch (error) {
    log.error(`Failed to start web process for app ${appId}:`, error);
    return null;
  }
}

// Start tunnel-only Expo process
async function startTunnelProcess(appId: number, appPath: string): Promise<ExpoProcess | null> {
  try {
    const tunnelPort = await findAvailablePort(19000);
    log.log(`🚇 Starting Expo tunnel process on port ${tunnelPort} for app ${appId}`);

    const tunnelProcess = spawn("npx", ["expo", "start", "--tunnel", "--port", tunnelPort.toString(), "--clear"], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_DOCTOR: '1',
        EXPO_NO_UPDATE_CHECK: '1',
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_INTERACTIVE: '1',
        FORCE_COLOR: '0',
        EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0'
      }
    });

    if (!tunnelProcess.pid) {
      throw new Error("Failed to start tunnel process");
    }

    const expoTunnelProcess: ExpoProcess = {
      process: tunnelProcess,
      type: 'tunnel',
      port: tunnelPort,
      pid: tunnelProcess.pid
    };

    // Handle tunnel process output
    tunnelProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      log.log(`[Tunnel ${appId}] ${output.trim()}`);
      
      // Extract tunnel URLs
      const status = expoProcesses.get(appId);
      if (status) {
        // Look for tunnel URL
        const tunnelMatch = output.match(/https:\/\/.*?\.ngrok\.io/);
        if (tunnelMatch) {
          status.tunnelUrl = tunnelMatch[0];
          status.qrUrl = tunnelMatch[0];
        }

        // Look for LAN URL
        const lanMatch = output.match(/exp:\/\/[\d.]+:\d+/);
        if (lanMatch) {
          status.lanUrl = lanMatch[0];
          if (!status.qrUrl) status.qrUrl = lanMatch[0];
        }

        status.lastUpdate = Date.now();
      }
    });

    tunnelProcess.stderr?.on('data', (data) => {
      log.warn(`[Tunnel ${appId} Error] ${data.toString().trim()}`);
    });

    tunnelProcess.on('exit', (code) => {
      log.log(`[Tunnel ${appId}] Process exited with code ${code}`);
      const status = expoProcesses.get(appId);
      if (status) {
        status.tunnelProcess = undefined;
        status.tunnelUrl = undefined;
        status.lanUrl = undefined;
        status.qrUrl = undefined;
      }
    });

    return expoTunnelProcess;
  } catch (error) {
    log.error(`Failed to start tunnel process for app ${appId}:`, error);
    return null;
  }
}

export function registerDualExpoHandlers() {
  log.log("🔧 Registering dual Expo handlers...");
  // Start dual Expo processes (web + tunnel)
  ipcMain.handle("expo:start-dual", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      log.log(`🚀 Starting dual Expo processes for app ${appId}`);

      // Kill any existing processes first
      await killExpoProcesses(appId);

      // Get app data
      const appData = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData.length) {
        throw new Error(`App ${appId} not found`);
      }

      const appPath = getDyadAppPath(appData[0].path);
      if (!fs.existsSync(appPath)) {
        throw new Error(`App path does not exist: ${appPath}`);
      }

      // Initialize status
      const status: DualExpoStatus = {
        isRunning: false,
        lastUpdate: Date.now(),
        buildStatus: 'idle'
      };
      expoProcesses.set(appId, status);

      // Start both processes concurrently
      const [webProcess, tunnelProcess] = await Promise.all([
        startWebProcess(appId, appPath),
        startTunnelProcess(appId, appPath)
      ]);

      // Update status
      if (webProcess) {
        status.webProcess = webProcess;
        status.webUrl = webProcess.url;
      }
      
      if (tunnelProcess) {
        status.tunnelProcess = tunnelProcess;
      }

      status.isRunning = !!(webProcess || tunnelProcess);
      status.buildStatus = 'building';

      log.log(`✅ Dual Expo processes started for app ${appId}. Web: ${!!webProcess}, Tunnel: ${!!tunnelProcess}`);

      return {
        success: true,
        webUrl: status.webUrl,
        webPort: webProcess?.port,
        tunnelPort: tunnelProcess?.port,
        message: `Started ${webProcess ? 'web' : ''}${webProcess && tunnelProcess ? ' and ' : ''}${tunnelProcess ? 'tunnel' : ''} process(es)`
      };

    } catch (error) {
      log.error(`Failed to start dual Expo for app ${appId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Stop all Expo processes for an app
  ipcMain.handle("expo:stop-dual", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      await killExpoProcesses(appId);
      log.log(`✅ Stopped all Expo processes for app ${appId}`);
      return { success: true };
    } catch (error) {
      log.error(`Failed to stop Expo processes for app ${appId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get status of dual Expo processes
  ipcMain.handle("expo:status-dual", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = expoProcesses.get(appId);
    
    if (!status) {
      return {
        isRunning: false,
        webUrl: undefined,
        tunnelUrl: undefined,
        lanUrl: undefined,
        qrUrl: undefined,
        buildStatus: 'idle'
      };
    }

    return {
      isRunning: status.isRunning,
      webUrl: status.webUrl,
      tunnelUrl: status.tunnelUrl,
      lanUrl: status.lanUrl,
      qrUrl: status.qrUrl,
      buildStatus: status.buildStatus,
      buildProgress: status.buildProgress,
      lastUpdate: status.lastUpdate,
      webProcessRunning: !!status.webProcess,
      tunnelProcessRunning: !!status.tunnelProcess
    };
  });

  // Health check for processes
  ipcMain.handle("expo:health-dual", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = expoProcesses.get(appId);
    
    if (!status) {
      return { healthy: false, reason: "No processes running" };
    }

    const webHealthy = !status.webProcess || !status.webProcess.process.killed;
    const tunnelHealthy = !status.tunnelProcess || !status.tunnelProcess.process.killed;

    return {
      healthy: webHealthy && tunnelHealthy,
      webHealthy,
      tunnelHealthy,
      webUrl: status.webUrl,
      qrUrl: status.qrUrl || status.lanUrl
    };
  });

  log.log("✅ Dual Expo handlers registered");
}
