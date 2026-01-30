import { ipcMain, BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import os from "os";
import log from "electron-log";

const logger = log.scope("terminal");

// Wrap logger methods to handle broken pipe errors
const safeLogger = {
  info: (message: string, ...args: any[]) => {
    try {
      logger.info(message, ...args);
    } catch (error: any) {
      if (error.code !== 'EPIPE') console.log('[terminal]', message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    try {
      logger.error(message, ...args);
    } catch (error: any) {
      if (error.code !== 'EPIPE') console.error('[terminal]', message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    try {
      logger.warn(message, ...args);
    } catch (error: any) {
      if (error.code !== 'EPIPE') console.warn('[terminal]', message, ...args);
    }
  }
};

const sessions = new Map<string, ChildProcess>();
let mainWindow: BrowserWindow | null = null;

export function bindTerminalWindow(window: BrowserWindow) {
  mainWindow = window;
}

function pickShell(): { shell: string; args: string[] } {
  if (process.platform === "win32") {
    // Use cmd.exe on Windows - it should work with proper stdin handling
    return {
      shell: process.env.COMSPEC || "C:\\WINDOWS\\system32\\cmd.exe",
      args: []
    };
  } else if (process.platform === "darwin") {
    return {
      shell: process.env.SHELL || "/bin/zsh",
      args: []
    };
  } else {
    return {
      shell: process.env.SHELL || "/bin/bash",
      args: []
    };
  }
}

/**
 * Create a new terminal session
 */
const handleTerminalCreate = async (
  _event: any,
  { cwd }: { cwd?: string }
): Promise<{ id: string }> => {
  try {
    const { shell, args } = pickShell();
    const id = Math.random().toString(36).slice(2);
    
    safeLogger.info(`Creating terminal session ${id} with shell: ${shell}`);
    
    const child = spawn(shell, args, {
      cwd: cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        FORCE_COLOR: "1",
        // Ensure proper terminal behavior
        COLUMNS: "120",
        LINES: "30",
        // Windows-specific: Enable command echoing
        PROMPT: "$P$G",
        PATHEXT: process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC"
      },
      windowsHide: false,
      // Windows-specific: Enable proper console mode
      detached: false,
    });

    sessions.set(id, child);

    // Handle stdout data
    child.stdout?.on("data", (data) => {
      const output = data.toString();
      mainWindow?.webContents.send("terminal:data", { id, data: output });
    });

    // Handle stderr data
    child.stderr?.on("data", (data) => {
      const output = data.toString();
      mainWindow?.webContents.send("terminal:data", { id, data: output });
    });

    // Handle process exit
    child.on("exit", (code) => {
      safeLogger.info(`Terminal session ${id} exited with code: ${code}`);
      mainWindow?.webContents.send("terminal:exit", { id, code });
      sessions.delete(id);
    });

    child.on("error", (error) => {
      safeLogger.error(`Terminal session ${id} error:`, error);
      mainWindow?.webContents.send("terminal:error", { id, error: error.message });
      sessions.delete(id);
    });

    return { id };
  } catch (error) {
    safeLogger.error("Failed to create terminal session:", error);
    throw new Error(`Failed to create terminal: ${error}`);
  }
};

/**
 * Write data to terminal session
 */
const handleTerminalWrite = (
  _event: any,
  { id, data }: { id: string; data: string }
): void => {
  const session = sessions.get(id);
  if (session && session.stdin) {
    safeLogger.info(`Writing to terminal ${id}: ${JSON.stringify(data)}`);
    session.stdin.write(data);
  } else {
    safeLogger.warn(`Terminal session ${id} not found or stdin not available`);
    safeLogger.warn(`Available sessions: ${Array.from(sessions.keys()).join(', ')}`);
  }
};

/**
 * Resize terminal session (placeholder - child_process doesn't support resize)
 */
const handleTerminalResize = (
  _event: any,
  { id, cols, rows }: { id: string; cols: number; rows: number }
): void => {
  // Note: Basic child_process doesn't support resize, but we can log it
  safeLogger.info(`Terminal resize requested for ${id}: ${cols}x${rows}`);
  // In a real implementation with node-pty, this would call session.resize(cols, rows)
};

/**
 * Kill terminal session
 */
const handleTerminalKill = (
  _event: any,
  { id }: { id: string }
): void => {
  const session = sessions.get(id);
  if (session) {
    safeLogger.info(`Killing terminal session ${id}`);
    session.kill();
    sessions.delete(id);
  }
};

/**
 * Register all terminal IPC handlers
 */
export function registerTerminalHandlers() {
  ipcMain.handle("terminal:create", handleTerminalCreate);
  ipcMain.handle("terminal:write", handleTerminalWrite);
  ipcMain.handle("terminal:resize", handleTerminalResize);
  ipcMain.handle("terminal:kill", handleTerminalKill);
  
}

/**
 * Clean up all terminal sessions
 */
export function cleanupTerminalSessions() {
  for (const [id, session] of sessions) {
    safeLogger.info(`Cleaning up terminal session ${id}`);
    session.kill();
  }
  sessions.clear();
}