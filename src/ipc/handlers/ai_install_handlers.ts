import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

const logger = log.scope('ai_install_handlers');

export function registerAIInstallHandlers() {
  ipcMain.handle('install-ai-transformers', async () => {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Starting AI transformers installation...');
        
        // Get the app root directory (where package.json is located)
        const appRoot = process.cwd();
        const packageJsonPath = path.join(appRoot, 'package.json');
        
        // Verify package.json exists
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error('package.json not found in app directory');
        }
        
        logger.info(`Installing transformers in directory: ${appRoot}`);
        
        // Determine npm command based on platform
        const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        
        // Spawn npm install process
        const installProcess = spawn(npmCommand, ['install', '@xenova/transformers'], {
          cwd: appRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        let stdout = '';
        let stderr = '';
        
        installProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          logger.info(`npm stdout: ${output}`);
        });
        
        installProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          logger.warn(`npm stderr: ${output}`);
        });
        
        installProcess.on('close', (code) => {
          if (code === 0) {
            logger.info('AI transformers installation completed successfully');
            
            // Verify the installation by checking if the package exists
            const transformersPath = path.join(appRoot, 'node_modules', '@xenova', 'transformers');
            const installed = fs.existsSync(transformersPath);
            
            if (installed) {
              logger.info('Verified: @xenova/transformers package is installed');
              resolve({
                success: true,
                message: 'AI transformers installed successfully',
                stdout,
                stderr
              });
            } else {
              logger.error('Installation completed but package not found');
              reject(new Error('Installation completed but package verification failed'));
            }
          } else {
            logger.error(`npm install failed with code ${code}`);
            logger.error(`stderr: ${stderr}`);
            reject(new Error(`Installation failed with exit code ${code}: ${stderr}`));
          }
        });
        
        installProcess.on('error', (error) => {
          logger.error('Failed to start npm install process:', error);
          reject(new Error(`Failed to start installation: ${error.message}`));
        });
        
        // Set a timeout for the installation (5 minutes)
        const timeout = setTimeout(() => {
          logger.error('Installation timeout - killing process');
          installProcess.kill();
          reject(new Error('Installation timed out after 5 minutes'));
        }, 5 * 60 * 1000);
        
        installProcess.on('close', () => {
          clearTimeout(timeout);
        });
        
      } catch (error) {
        logger.error('Error during AI transformers installation:', error);
        reject(error);
      }
    });
  });

  ipcMain.handle('check-ai-transformers-installed', async () => {
    try {
      const appRoot = process.cwd();
      const transformersPath = path.join(appRoot, 'node_modules', '@xenova', 'transformers');
      const installed = fs.existsSync(transformersPath);
      
      logger.info(`AI transformers installation check: ${installed ? 'installed' : 'not installed'}`);
      
      return {
        installed,
        path: transformersPath
      };
    } catch (error) {
      logger.error('Error checking AI transformers installation:', error);
      return {
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  logger.info('AI install handlers registered');
}


