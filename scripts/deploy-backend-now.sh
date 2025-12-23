#!/bin/bash

# Quick deployment script for backend to VPS
# This ensures the latest code (with auto-table creation) is on VPS

set -e

VPS_HOST="168.231.116.44"
VPS_USER="applaa-app"
VPS_BACKEND_PATH="/home/applaa-app/applaa-backend"
SSH_KEY="$HOME/.ssh/id_ed25519"
BACKEND_PATH="$(cd "$(dirname "$0")/.." && pwd)/backend"

echo "🚀 Deploying backend to VPS..."

# Step 1: Build locally
echo "📦 Building backend locally..."
cd "$BACKEND_PATH"
npm run build

# Step 2: Sync files
echo "📤 Syncing files to VPS..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.env' \
  --exclude 'dist' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$BACKEND_PATH/" \
  "${VPS_USER}@${VPS_HOST}:${VPS_BACKEND_PATH}/"

# Step 3: Rebuild and restart on VPS
echo "🔨 Rebuilding and restarting on VPS..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" \
  "cd ${VPS_BACKEND_PATH} && \
   chown -R ${VPS_USER}:${VPS_USER} . 2>/dev/null || true && \
   npm install --production && \
   npm run build && \
   pm2 restart applaa-backend || pm2 start dist/index.js --name applaa-backend && \
   pm2 save"

# Step 4: Fix Nginx CORS
echo "🔧 Fixing Nginx CORS configuration..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" \
  "sudo sed -i '/add_header.*Access-Control-Allow-Origin/d' /etc/nginx/sites-available/applaa-backend.conf && \
   sudo sed -i '/add_header.*Access-Control-Allow-Methods/d' /etc/nginx/sites-available/applaa-backend.conf && \
   sudo sed -i '/add_header.*Access-Control-Allow-Headers/d' /etc/nginx/sites-available/applaa-backend.conf && \
   sudo sed -i '/add_header.*Cross-Origin-Resource-Policy/d' /etc/nginx/sites-available/applaa-backend.conf && \
   sudo sed -i '/if (\$request_method = '\''OPTIONS'\'')/,/}/d' /etc/nginx/sites-available/applaa-backend.conf && \
   sudo nginx -t && \
   sudo systemctl reload nginx"

# Step 5: Verify
echo "✅ Verifying deployment..."
sleep 2
curl -s "http://${VPS_HOST}:3001/health" | jq '.' || echo "Health check failed, but deployment completed"

echo "✅ Deployment complete!"

