import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import { getDyadAppPath } from "../../paths/paths";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

interface TerminalProcess {
  process: ChildProcess;
  appId: number;
  command: string;
}

// Store running terminal processes
const runningTerminals = new Map<number, TerminalProcess>();

// Helper function for legacy-safe app queries
async function getAppSafe(appId: number): Promise<any> {
  try {
    const result = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    return result[0] as any;
  } catch (err) {
    log.warn("terminal_handlers.getAppSafe: falling back to legacy SELECT due to:", err);
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

    if (!row) return undefined;

    // Convert legacy timestamps
    if (row.createdAt && typeof row.createdAt === "number") {
      row.createdAt = new Date(row.createdAt * 1000);
    }
    if (row.updatedAt && typeof row.updatedAt === "number") {
      row.updatedAt = new Date(row.updatedAt * 1000);
    }

    // New fields absent in legacy DBs
    row.displayName = undefined;
    row.packageId = undefined;
    row.slug = undefined;

    return row;
  }
}

export function registerTerminalHandlers() {
  // Execute command in app directory
  ipcMain.handle("terminal:execute", async (
    event,
    params: { appId: number; command: string }
  ) => {
    const { appId, command } = params;

    try {
      // Get app data
      const appData = await getAppSafe(appId);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      log.log(`Executing terminal command in ${appPath}: ${command}`);

      // Stop any existing terminal process for this app
      if (runningTerminals.has(appId)) {
        const existing = runningTerminals.get(appId);
        if (existing?.process && !existing.process.killed) {
          log.log(`Stopping existing terminal process for app ${appId}`);
          try {
            // Close stdin first to prevent EPIPE errors
            if (existing.process.stdin && !existing.process.stdin.destroyed) {
              existing.process.stdin.end();
            }
            
            if (process.platform === "win32") {
              spawn("taskkill", ["/pid", existing.process.pid!.toString(), "/f", "/t"]);
            } else {
              existing.process.kill("SIGTERM");
            }
            
            // Wait a moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            log.warn(`Error stopping existing process for app ${appId}:`, error);
          }
        }
        runningTerminals.delete(appId);
      }

      // Parse command for proper execution
      let shellCommand: string;
      let args: string[] = [];

      if (command.includes('npm run web') || command.includes('expo start')) {
        // For Expo commands, use the proper expo start command
        if (command.includes('expo start')) {
          shellCommand = 'npx';
          args = ['expo', 'start', '--clear', '--non-interactive']; // Removed --reset-cache as it's not supported in new CLI
          if (command.includes('--tunnel')) {
            args.push('--tunnel');
          }
        } else {
          shellCommand = 'npm';
          args = ['run', 'web'];
        }
      } else if (command.includes('npm install')) {
        shellCommand = 'npm';
        args = ['install'];
      } else {
        // For other commands, split by spaces
        const parts = command.trim().split(/\s+/);
        shellCommand = parts[0];
        args = parts.slice(1);
      }

      // Spawn the process
      const terminalProcess = spawn(shellCommand, args, {
        cwd: appPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          EXPO_NO_DOCTOR: '1',
          EXPO_NO_UPDATE_CHECK: '1',
          CI: '1',
          EXPO_NO_TELEMETRY: '1',
          EXPO_NO_INTERACTIVE: '1', // Force non-interactive mode
          EXPO_USE_DEV_SERVER: 'true',
          EXPO_AUTO_PORT: '1', // Let Expo automatically find available port
          FORCE_COLOR: '0', // Disable colors for cleaner output
        }
      });

      if (!terminalProcess.pid) {
        throw new Error(`Failed to spawn terminal process: ${command}`);
      }

      // Store the process
      runningTerminals.set(appId, {
        process: terminalProcess,
        appId,
        command
      });

      // Send initial command echo
      event.sender.send('terminal:output', {
        appId,
        type: 'command',
        content: `$ ${command}`,
        timestamp: new Date().toISOString()
      });

      // Handle stdout
      terminalProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        log.log(`Terminal stdout (${appId}):`, output);
        
        event.sender.send('terminal:output', {
          appId,
          type: 'stdout',
          content: output,
          timestamp: new Date().toISOString()
        });
      });

      // Handle stderr
      terminalProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        log.warn(`Terminal stderr (${appId}):`, output);
        
        // Check for port conflict and auto-respond with "Y" to use alternative port
        if (output.includes('Use port') && output.includes('instead?') && 
            terminalProcess.stdin && !terminalProcess.stdin.destroyed && !terminalProcess.killed) {
          log.log(`Auto-accepting alternative port for app ${appId}`);
          
          try {
            terminalProcess.stdin.write('Y\n');
            
            // Send a system message about the auto-acceptance
            event.sender.send('terminal:output', {
              appId,
              type: 'system',
              content: '✓ Automatically accepted alternative port',
              timestamp: new Date().toISOString()
            });
          } catch (writeError) {
            log.warn(`Failed to write to stdin for app ${appId}:`, writeError);
            // Process might have already closed, just log and continue
          }
        }
        
        event.sender.send('terminal:output', {
          appId,
          type: 'stderr',
          content: output,
          timestamp: new Date().toISOString()
        });
      });

      // Handle process close
      terminalProcess.on('close', (code) => {
        log.log(`Terminal process for app ${appId} exited with code ${code}`);
        
        // Clean up stdin to prevent future EPIPE errors
        try {
          if (terminalProcess.stdin && !terminalProcess.stdin.destroyed) {
            terminalProcess.stdin.end();
          }
        } catch (error) {
          // Ignore cleanup errors
        }
        
        event.sender.send('terminal:output', {
          appId,
          type: 'system',
          content: `Process exited with code ${code}`,
          timestamp: new Date().toISOString()
        });

        runningTerminals.delete(appId);
      });

      // Handle process error
      terminalProcess.on('error', (error) => {
        log.error(`Terminal process error for app ${appId}:`, error);
        
        event.sender.send('terminal:output', {
          appId,
          type: 'stderr',
          content: `Process error: ${error.message}`,
          timestamp: new Date().toISOString()
        });

        runningTerminals.delete(appId);
      });

      return { success: true, pid: terminalProcess.pid };

    } catch (error) {
      log.error(`Failed to execute terminal command:`, error);
      throw error;
    }
  });

  // Stop terminal process
  ipcMain.handle("terminal:stop", async (
    event,
    params: { appId: number }
  ) => {
    const { appId } = params;

    try {
      if (runningTerminals.has(appId)) {
        const terminal = runningTerminals.get(appId);
        if (terminal?.process && !terminal.process.killed) {
          log.log(`Stopping terminal process for app ${appId}`);
          
          try {
            // Close stdin first to prevent EPIPE errors
            if (terminal.process.stdin && !terminal.process.stdin.destroyed) {
              terminal.process.stdin.end();
            }
            
            if (process.platform === "win32") {
              spawn("taskkill", ["/pid", terminal.process.pid!.toString(), "/f", "/t"]);
            } else {
              terminal.process.kill("SIGTERM");
            }

            event.sender.send('terminal:output', {
              appId,
              type: 'system',
              content: 'Process stopped by user',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            log.warn(`Error stopping terminal process for app ${appId}:`, error);
          }
        }
        runningTerminals.delete(appId);
      }

      return { success: true };
    } catch (error) {
      log.error(`Failed to stop terminal process:`, error);
      throw error;
    }
  });

  // Get terminal status
  ipcMain.handle("terminal:status", async (
    _,
    params: { appId: number }
  ) => {
    const { appId } = params;
    
    const terminal = runningTerminals.get(appId);
    return {
      isRunning: terminal ? !terminal.process.killed : false,
      command: terminal?.command || null,
      pid: terminal?.process.pid || null
    };
  });

  // Clear terminal (just sends a clear message)
  ipcMain.handle("terminal:clear", async (
    event,
    params: { appId: number }
  ) => {
    const { appId } = params;
    
    event.sender.send('terminal:output', {
      appId,
      type: 'system',
      content: 'Terminal cleared',
      timestamp: new Date().toISOString()
    });

    return { success: true };
  });
}
