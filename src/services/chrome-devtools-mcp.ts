import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';

const logger = log.scope("chrome-devtools-mcp");

export interface DevToolsMessage {
  type: 'console' | 'network' | 'error' | 'performance';
  timestamp: number;
  level?: 'log' | 'warn' | 'error' | 'info';
  message: string;
  url?: string;
  status?: number;
  method?: string;
  stack?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
  type: string;
}

export class ChromeDevToolsMCPService {
  private mcpProcess: ChildProcess | null = null;
  private isConnected = false;
  private messageCallbacks: ((message: DevToolsMessage) => void)[] = [];
  private networkCallbacks: ((request: NetworkRequest) => void)[] = [];
  private consoleCallbacks: ((message: DevToolsMessage) => void)[] = [];

  constructor() {
    logger.info('🔧 Chrome DevTools MCP Service initialized');
  }

  /**
   * Start Chrome DevTools MCP server
   */
  async start(): Promise<void> {
    logger.info('🔧 ChromeDevToolsMCPService.start() called');
    
    if (this.mcpProcess) {
      logger.warn('⚠️ Chrome DevTools MCP already running');
      return;
    }

    try {
      logger.info('🚀 Starting Chrome DevTools MCP server...');
      
      // For now, simulate a successful start without external dependencies
      // This prevents the "No handler registered" error while we implement the full MCP integration
      this.isConnected = true;
      logger.info('✅ Chrome DevTools MCP server started successfully (simulated)');
      
      // TODO: Implement actual chrome-devtools-mcp integration when the package is stable
      // this.mcpProcess = spawn('npx', [
      //   'chrome-devtools-mcp@latest',
      //   '--headless=false',
      //   '--isolated=true'
      // ], {
      //   stdio: ['pipe', 'pipe', 'pipe'],
      //   env: {
      //     ...process.env,
      //     NODE_ENV: 'development'
      //   }
      // });
      
    } catch (error) {
      logger.error('❌ Failed to start Chrome DevTools MCP:', error);
      throw error;
    }
  }

  /**
   * Stop Chrome DevTools MCP server
   */
  async stop(): Promise<void> {
    if (this.mcpProcess) {
      logger.info('🛑 Stopping Chrome DevTools MCP server...');
      this.mcpProcess.kill('SIGTERM');
      this.mcpProcess = null;
      this.isConnected = false;
    }
  }

  /**
   * Navigate to a URL and start monitoring
   */
  async navigateToPreview(url: string): Promise<void> {
    if (!this.isConnected) {
      await this.start();
    }

    try {
      logger.info(`🌐 Navigating to preview URL: ${url}`);
      
      // Send navigation command to MCP
      const navigateCommand = {
        method: 'navigate_page',
        params: { url }
      };

      if (this.mcpProcess?.stdin) {
        this.mcpProcess.stdin.write(JSON.stringify(navigateCommand) + '\n');
      }

      // Start monitoring console messages
      this.startConsoleMonitoring();
      
      // Start monitoring network requests
      this.startNetworkMonitoring();

    } catch (error) {
      logger.error('❌ Failed to navigate to preview:', error);
      throw error;
    }
  }

  /**
   * Get console messages from the preview
   */
  async getConsoleMessages(): Promise<DevToolsMessage[]> {
    if (!this.isConnected) return [];

    try {
      // Return mock console messages for now
      return [
        {
          type: 'console',
          timestamp: Date.now(),
          level: 'info',
          message: 'Chrome DevTools MCP connected (simulated)',
          url: 'http://localhost:8081'
        },
        {
          type: 'console',
          timestamp: Date.now() - 1000,
          level: 'log',
          message: 'Preview loaded successfully',
          url: 'http://localhost:8081'
        }
      ];
    } catch (error) {
      logger.error('❌ Failed to get console messages:', error);
      return [];
    }
  }

  /**
   * Get network requests
   */
  async getNetworkRequests(): Promise<NetworkRequest[]> {
    if (!this.isConnected) return [];

    try {
      // Return mock network requests for now
      return [
        {
          url: 'http://localhost:8081',
          method: 'GET',
          status: 200,
          statusText: 'OK',
          responseTime: 150,
          size: 1024,
          type: 'document'
        },
        {
          url: 'http://localhost:8081/assets/bundle.js',
          method: 'GET',
          status: 200,
          statusText: 'OK',
          responseTime: 89,
          size: 2048,
          type: 'script'
        }
      ];
    } catch (error) {
      logger.error('❌ Failed to get network requests:', error);
      return [];
    }
  }

  /**
   * Take a screenshot of the preview
   */
  async takeScreenshot(): Promise<string> {
    if (!this.isConnected) throw new Error('MCP not connected');

    try {
      const command = {
        method: 'take_screenshot',
        params: {}
      };

      // This would return a base64 image
      return '';
    } catch (error) {
      logger.error('❌ Failed to take screenshot:', error);
      throw error;
    }
  }

  /**
   * Subscribe to console messages
   */
  onConsoleMessage(callback: (message: DevToolsMessage) => void): void {
    this.consoleCallbacks.push(callback);
  }

  /**
   * Subscribe to network requests
   */
  onNetworkRequest(callback: (request: NetworkRequest) => void): void {
    this.networkCallbacks.push(callback);
  }

  /**
   * Subscribe to all messages
   */
  onMessage(callback: (message: DevToolsMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Check if MCP is connected
   */
  getConnected(): boolean {
    return this.isConnected;
  }

  private parseMCPOutput(output: string): void {
    try {
      // Parse MCP protocol messages
      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          if (message.type === 'console') {
            const consoleMessage: DevToolsMessage = {
              type: 'console',
              timestamp: Date.now(),
              level: message.level || 'log',
              message: message.text || message.message,
              url: message.url
            };
            
            this.notifyConsoleCallbacks(consoleMessage);
            this.notifyCallbacks(consoleMessage);
          }
          
          if (message.type === 'network') {
            const networkRequest: NetworkRequest = {
              url: message.url,
              method: message.method || 'GET',
              status: message.status || 200,
              statusText: message.statusText || 'OK',
              responseTime: message.responseTime || 0,
              size: message.size || 0,
              type: message.type || 'document'
            };
            
            this.notifyNetworkCallbacks(networkRequest);
          }
          
        } catch (parseError) {
          // Not JSON, treat as regular console output
          const consoleMessage: DevToolsMessage = {
            type: 'console',
            timestamp: Date.now(),
            level: 'log',
            message: line
          };
          
          this.notifyConsoleCallbacks(consoleMessage);
          this.notifyCallbacks(consoleMessage);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse MCP output:', error);
    }
  }

  private startConsoleMonitoring(): void {
    logger.info('👂 Starting console message monitoring...');
    // This would be handled by the MCP protocol
  }

  private startNetworkMonitoring(): void {
    logger.info('🌐 Starting network request monitoring...');
    // This would be handled by the MCP protocol
  }

  private notifyCallbacks(message: DevToolsMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.warn('⚠️ Error in message callback:', error);
      }
    });
  }

  private notifyConsoleCallbacks(message: DevToolsMessage): void {
    this.consoleCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.warn('⚠️ Error in console callback:', error);
      }
    });
  }

  private notifyNetworkCallbacks(request: NetworkRequest): void {
    this.networkCallbacks.forEach(callback => {
      try {
        callback(request);
      } catch (error) {
        logger.warn('⚠️ Error in network callback:', error);
      }
    });
  }
}

// Singleton instance
export const chromeDevToolsMCP = new ChromeDevToolsMCPService();
