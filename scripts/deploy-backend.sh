#!/bin/bash

# Automated Backend Deployment Script
# Syncs backend code to VPS and restarts the service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="168.231.116.44"
VPS_USER="applaa-app"
VPS_BACKEND_PATH="/home/applaa-app/applaa-backend"
LOCAL_BACKEND_PATH="./backend"

echo -e "${GREEN}🚀 Starting automated backend deployment...${NC}"

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo -e "${RED}❌ SSH key not found at ~/.ssh/id_ed25519${NC}"
    exit 1
fi

# Step 1: Build backend locally (to catch any TypeScript errors)
echo -e "${YELLOW}📦 Building backend locally...${NC}"
cd "$LOCAL_BACKEND_PATH"
npm run build
cd - > /dev/null

# Step 2: Sync files to VPS using rsync
echo -e "${YELLOW}📤 Syncing files to VPS...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.env' \
  -e "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  "$LOCAL_BACKEND_PATH/" \
  "$VPS_USER@$VPS_HOST:$VPS_BACKEND_PATH/"

# Step 3: Rebuild and restart on VPS
echo -e "${YELLOW}🔨 Rebuilding and restarting backend on VPS...${NC}"
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" << 'ENDSSH'
cd /home/applaa-app/applaa-backend
npm install --production
npm run build
pm2 restart applaa-backend || pm2 start dist/index.js --name applaa-backend
pm2 save
ENDSSH

# Step 4: Verify deployment
echo -e "${YELLOW}✅ Verifying deployment...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s http://$VPS_HOST:3001/health || echo "failed")

if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
    echo -e "${GREEN}   Health check: http://$VPS_HOST:3001/health${NC}"
else
    echo -e "${RED}❌ Deployment completed but health check failed${NC}"
    echo -e "${YELLOW}   Check logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs applaa-backend --lines 50'${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"

