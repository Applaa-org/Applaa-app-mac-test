import { ipcMain, IpcMainInvokeEvent } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("playwright-mcp");
const handle = createLoggedHandler(logger);

// Global MCP server process
let mcpServerProcess: ChildProcess | null = null;
let mcpServerPort: number | null = null;

interface StartMCPServerParams {
  port?: number;
}

interface RunAppTestParams {
  appId: number;
  appUrl: string;
  testType?: 'smoke' | 'full' | 'accessibility';
}

interface MCPTestResult {
  success: boolean;
  screenshots: string[];
  errors: string[];
  performance: {
    loadTime: number;
    networkRequests: number;
  };
  accessibility: {
    violations: number;
    warnings: number;
  };
}

// --- Start Playwright MCP Server ---
async function handleStartMCPServer(
  event: IpcMainInvokeEvent,
  { port = 3001 }: StartMCPServerParams = {}
): Promise<{ success: boolean; port: number; error?: string }> {
  try {
    if (mcpServerProcess) {
      logger.info("MCP server already running");
      return { success: true, port: mcpServerPort! };
    }

    logger.info(`Starting Playwright MCP server on port ${port}`);
    
    // Check if @playwright/mcp is installed
    try {
      require.resolve("@playwright/mcp");
    } catch (e) {
      const error = "Playwright MCP package not found. Please install it with: npm install -D @playwright/mcp";
      logger.error(error);
      return { success: false, port: 0, error };
    }
    
    // Start the MCP server using npx (Windows-compatible)
    const isWindows = process.platform === "win32";
    const command = isWindows ? "npx.cmd" : "npx";
    
    mcpServerProcess = spawn(command, ["@playwright/mcp", "--port", port.toString()], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWindows, // Use shell on Windows to resolve npx
    });

    mcpServerPort = port;

    // Handle server output
    mcpServerProcess.stdout?.on("data", (data) => {
      logger.info(`MCP Server: ${data.toString().trim()}`);
    });

    mcpServerProcess.stderr?.on("data", (data) => {
      logger.warn(`MCP Server Error: ${data.toString().trim()}`);
    });

    mcpServerProcess.on("exit", (code) => {
      logger.info(`MCP server exited with code ${code}`);
      mcpServerProcess = null;
      mcpServerPort = null;
    });

    mcpServerProcess.on("error", (error) => {
      logger.error("MCP server process error:", error);
      mcpServerProcess = null;
      mcpServerPort = null;
    });

    // Wait a moment for server to start and check if it's still running
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!mcpServerProcess) {
      return { success: false, port: 0, error: "MCP server failed to start" };
    }

    return { success: true, port };
  } catch (error: any) {
    logger.error("Failed to start MCP server:", error);
    mcpServerProcess = null;
    mcpServerPort = null;
    return { success: false, port: 0, error: error.message };
  }
}

// --- Stop Playwright MCP Server ---
async function handleStopMCPServer(): Promise<{ success: boolean }> {
  try {
    if (!mcpServerProcess) {
      return { success: true };
    }

    logger.info("Stopping Playwright MCP server");
    mcpServerProcess.kill();
    mcpServerProcess = null;
    mcpServerPort = null;

    return { success: true };
  } catch (error: any) {
    logger.error("Failed to stop MCP server:", error);
    return { success: false };
  }
}

// --- Run App Tests ---
async function handleRunAppTest(
  event: IpcMainInvokeEvent,
  { appId, appUrl, testType = 'smoke' }: RunAppTestParams
): Promise<MCPTestResult> {
  try {
    logger.info(`Running ${testType} test for app ${appId} at ${appUrl}`);

    // Ensure MCP server is running
    if (!mcpServerProcess) {
      await handleStartMCPServer(event, {});
    }

    // Create test artifacts directory
    const testDir = path.join(process.cwd(), 'test-artifacts', `app-${appId}`);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Generate and run test based on type
    const testResult = await runTestSuite(appUrl, testType, testDir);
    
    logger.info(`Test completed for app ${appId}:`, testResult);
    return testResult;

  } catch (error: any) {
    logger.error(`Test failed for app ${appId}:`, error);
    return {
      success: false,
      screenshots: [],
      errors: [error.message],
      performance: { loadTime: 0, networkRequests: 0 },
      accessibility: { violations: 0, warnings: 0 }
    };
  }
}

// --- Generate Test Suite ---
async function runTestSuite(
  appUrl: string, 
  testType: string, 
  testDir: string
): Promise<MCPTestResult> {
  const startTime = Date.now();
  const screenshots: string[] = [];
  const errors: string[] = [];
  
  try {
    // For now, simulate test execution
    // In a real implementation, this would use MCP client to:
    // 1. Navigate to appUrl
    // 2. Take screenshots
    // 3. Check for console errors
    // 4. Validate key elements exist
    // 5. Test basic interactions
    
    const loadTime = Date.now() - startTime;
    
    // Simulate screenshot capture
    const screenshotPath = path.join(testDir, `${testType}-${Date.now()}.png`);
    screenshots.push(screenshotPath);
    
    return {
      success: true,
      screenshots,
      errors,
      performance: {
        loadTime,
        networkRequests: 5 // Simulated
      },
      accessibility: {
        violations: 0,
        warnings: 1 // Simulated
      }
    };

  } catch (error: any) {
    errors.push(error.message);
    return {
      success: false,
      screenshots,
      errors,
      performance: { loadTime: 0, networkRequests: 0 },
      accessibility: { violations: 0, warnings: 0 }
    };
  }
}

// --- Get MCP Server Status ---
async function handleGetMCPStatus(): Promise<{ 
  running: boolean; 
  port: number | null; 
  uptime?: number 
}> {
  return {
    running: mcpServerProcess !== null,
    port: mcpServerPort,
    uptime: mcpServerProcess ? Date.now() : undefined
  };
}

// --- Register Handlers ---
export function registerPlaywrightMCPHandlers() {
  handle("playwright-mcp:start-server", handleStartMCPServer);
  handle("playwright-mcp:stop-server", handleStopMCPServer);
  handle("playwright-mcp:run-test", handleRunAppTest);
  handle("playwright-mcp:status", handleGetMCPStatus);
  
}

