#!/bin/bash

# Quick fix for Nginx CORS duplicate headers issue
# Run this on the VPS to fix the issue immediately

set -e

VPS_HOST="168.231.116.44"
VPS_USER="applaa-app"
SSH_KEY="$HOME/.ssh/id_ed25519"

echo "🔧 Fixing Nginx CORS configuration on VPS..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" << 'ENDSSH'
# Backup Nginx config
sudo cp /etc/nginx/sites-available/applaa-backend.conf /etc/nginx/sites-available/applaa-backend.conf.backup.$(date +%Y%m%d_%H%M%S)

# Remove CORS headers from Nginx
echo "🗑️  Removing duplicate CORS headers..."
sudo sed -i '/add_header.*Access-Control-Allow-Origin/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Methods/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Headers/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Credentials/d' /etc/nginx/sites-available/applaa-backend.conf

# Test and reload
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded! CORS headers removed."
else
    echo "❌ Nginx config test failed - restoring backup"
    sudo cp /etc/nginx/sites-available/applaa-backend.conf.backup.* /etc/nginx/sites-available/applaa-backend.conf
    exit 1
fi
ENDSSH

echo ""
echo "✅ Nginx CORS fix completed!"
echo "🧪 Test with: curl -H 'Origin: http://localhost:5173' http://168.231.116.44:3001/api/todos -v"

