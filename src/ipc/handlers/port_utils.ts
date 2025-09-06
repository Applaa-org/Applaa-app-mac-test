/**
 * Smart Port Detection Utility
 * Finds available ports for Metro bundler with fallback strategy
 */
import * as net from 'net';
import log from 'electron-log';

const logger = log.scope('port-detection');

export interface PortDetectionResult {
  port: number;
  isPreferred: boolean;
  message: string;
}

/**
 * Find an available port starting from basePort
 */
export async function findAvailablePort(basePort: number = 8081, maxTries: number = 20): Promise<PortDetectionResult> {
  logger.info(`🔍 Finding available port starting from ${startPort}`);
  
  for (let i = 0; i < maxTries; i++) {
    const testPort = basePort + i;
    const isAvailable = await isPortFree(testPort);
    
    if (isAvailable) {
      const isPreferred = testPort === basePort;
      const message = isPreferred 
        ? `Using preferred port ${testPort}`
        : `Port ${basePort} busy, using fallback port ${testPort}`;
      
      logger.info(message);
      return {
        port: testPort,
        isPreferred,
        message
      };
    }
  }
  
  // If no port found, return the base port anyway (let Expo handle the conflict)
  logger.warn(`⚠️ No free port found in range ${startPort}-${endPort}, using ${endPort} anyway`);
  return {
    port: basePort,
    isPreferred: false,
    message: `No free port found, using ${basePort} (may conflict)`
  };
}

/**
 * Check if a port is free
 */
export async function isPortFree(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Kill processes on specific ports (cross-platform)
 */
export async function killProcessOnPorts(ports: number[]): Promise<void> {
  logger.info(`🔄 Killing processes on ports: ${ports.join(', ')}`);
  
  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        const { spawn } = require('child_process');
        // Windows: Find and kill process using port
        const netstat = spawn('netstat', ['-ano'], { shell: true });
        const findstr = spawn('findstr', [`:${port}`], { shell: true });
        
        netstat.stdout.pipe(findstr.stdin);
        
        findstr.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach((line) => {
            const match = line.match(/\s+(\d+)\s*$/);
            if (match) {
              const pid = match[1];
              spawn('taskkill', ['/PID', pid, '/F'], { shell: true });
            }
          });
        });
      } else {
        // Unix/Linux/Mac: Use lsof and kill
        const { execSync } = require('child_process');
        try {
          const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
          const pids = result.trim().split('\n').filter(pid => pid);
          pids.forEach(pid => {
            execSync(`kill -9 ${pid}`);
          });
        } catch (error) {
          // Port not in use, ignore
        }
      }
    } catch (error) {
      logger.warn(`❌ Failed to kill process on port ${port}:`, error);
    }
  }
  
  // Wait a moment for processes to be killed
  await new Promise(resolve => setTimeout(resolve, 1000));
}
