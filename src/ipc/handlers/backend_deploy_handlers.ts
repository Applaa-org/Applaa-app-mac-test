/**
 * Automated Backend Deployment Handler
 * Automatically syncs backend code to VPS when changes are made
 */

import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import logger from 'electron-log';

const execAsync = promisify(exec);

const VPS_HOST = '168.231.116.44';
const VPS_USER = 'applaa-app';
const VPS_BACKEND_PATH = '/home/applaa-app/applaa-backend';
const SSH_KEY = path.join(process.env.HOME || '', '.ssh', 'id_ed25519');

/**
 * Deploy backend to VPS automatically
 */
export async function deployBackendToVPS(): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log('🚀 Starting automated backend deployment...');

    const backendPath = path.join(__dirname, '..', '..', '..', 'backend');

    // Step 1: Build backend locally
    logger.log('📦 Building backend locally...');
    await execAsync('npm run build', { cwd: backendPath });

    // Step 2: Sync files to VPS using rsync
    logger.log('📤 Syncing files to VPS...');
    // Remove dist directory on VPS first to avoid permission issues
    await execAsync(`ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} 'rm -rf ${VPS_BACKEND_PATH}/dist'`);
    
    const rsyncCommand = `rsync -avz --delete \
      --exclude 'node_modules' \
      --exclude '.git' \
      --exclude '*.log' \
      --exclude '.env' \
      --exclude 'dist' \
      -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
      "${backendPath}/" \
      "${VPS_USER}@${VPS_HOST}:${VPS_BACKEND_PATH}/"`;

    await execAsync(rsyncCommand);

    // Step 3: Rebuild and restart on VPS
    logger.log('🔨 Rebuilding and restarting backend on VPS...');
    // Fix ownership if needed (in case files were created by different user), then build
    const sshCommand = `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} 'cd ${VPS_BACKEND_PATH} && chown -R ${VPS_USER}:${VPS_USER} . 2>/dev/null || true && npm install --production && npm run build && pm2 restart applaa-backend || pm2 start dist/index.js --name applaa-backend && pm2 save'`;

    await execAsync(sshCommand);

    // Step 4: Fix Nginx CORS configuration (remove duplicate headers and CORP)
    logger.log('🔧 Fixing Nginx CORS configuration...');
    try {
      const nginxFixCommand = `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} 'sudo sed -i "/add_header.*Access-Control-Allow-Origin/d" /etc/nginx/sites-available/applaa-backend.conf && sudo sed -i "/add_header.*Access-Control-Allow-Methods/d" /etc/nginx/sites-available/applaa-backend.conf && sudo sed -i "/add_header.*Access-Control-Allow-Headers/d" /etc/nginx/sites-available/applaa-backend.conf && sudo sed -i "/add_header.*Cross-Origin-Resource-Policy/d" /etc/nginx/sites-available/applaa-backend.conf && sudo nginx -t && sudo systemctl reload nginx'`;
      await execAsync(nginxFixCommand);
      logger.log('✅ Nginx CORS configuration fixed');
    } catch (error) {
      logger.warn('⚠️  Failed to fix Nginx CORS (may need manual fix):', error);
      // Don't fail deployment if Nginx fix fails
    }

    // Step 4: Verify deployment
    logger.log('✅ Verifying deployment...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`http://${VPS_HOST}:3001/health`);
      const data = await response.json() as { status: string };

      if (data.status === 'ok') {
        logger.log('✅ Backend deployed successfully!');
        return { success: true };
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      logger.warn('⚠️  Deployment completed but health check failed');
      return { success: false, error: error instanceof Error ? error.message : 'Health check failed' };
    }
  } catch (error) {
    logger.error(`❌ Deployment failed: ${error}`);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Register IPC handlers for backend deployment
 */
export function registerBackendDeployHandlers() {
  ipcMain.handle('deploy-backend', async () => {
    return await deployBackendToVPS();
  });
}

