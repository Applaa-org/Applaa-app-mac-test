#!/usr/bin/env node

/**
 * Automated Backend Deployment Script
 * Syncs backend code to VPS and restarts the service automatically
 * Can be called from Electron app or run manually
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const VPS_HOST = '168.231.116.44';
const VPS_USER = 'applaa-app';
const VPS_BACKEND_PATH = '/home/applaa-app/applaa-backend';
const LOCAL_BACKEND_PATH = path.join(__dirname, '..', 'backend');
const SSH_KEY = path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'id_ed25519');

function log(message, color = 'default') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

async function deployBackend() {
  try {
    log('🚀 Starting automated backend deployment...', 'green');

    // Step 1: Build backend locally
    log('📦 Building backend locally...', 'yellow');
    process.chdir(LOCAL_BACKEND_PATH);
    exec('npm run build');
    process.chdir(__dirname);

    // Step 2: Sync files to VPS using rsync
    log('📤 Syncing files to VPS...', 'yellow');
    const rsyncCommand = `rsync -avz --delete \
      --exclude 'node_modules' \
      --exclude '.git' \
      --exclude '*.log' \
      --exclude '.env' \
      -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
      "${LOCAL_BACKEND_PATH}/" \
      "${VPS_USER}@${VPS_HOST}:${VPS_BACKEND_PATH}/"`;

    exec(rsyncCommand);

    // Step 3: Rebuild and restart on VPS
    log('🔨 Rebuilding and restarting backend on VPS...', 'yellow');
    const sshCommand = `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd ${VPS_BACKEND_PATH}
npm install --production
npm run build
pm2 restart applaa-backend || pm2 start dist/index.js --name applaa-backend
pm2 save
ENDSSH`;

    exec(sshCommand);

    // Step 4: Verify deployment
    log('✅ Verifying deployment...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`http://${VPS_HOST}:3001/health`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        log('✅ Backend deployed successfully!', 'green');
        log(`   Health check: http://${VPS_HOST}:3001/health`, 'green');
        return { success: true };
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      log('⚠️  Deployment completed but health check failed', 'yellow');
      log(`   Check logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs applaa-backend --lines 50'`, 'yellow');
      return { success: false, error: error.message };
    }
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  deployBackend()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      log(`❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { deployBackend };

