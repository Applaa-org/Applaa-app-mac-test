#!/bin/bash

# Fix Nginx CORS Configuration
# Removes duplicate CORS headers from Nginx so Express can handle CORS

set -e

NGINX_CONFIG="/etc/nginx/sites-available/applaa-backend.conf"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing Nginx CORS configuration..."

# Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at $NGINX_CONFIG"
    exit 1
fi

# Create backup
echo "📦 Creating backup: $BACKUP_CONFIG"
sudo cp "$NGINX_CONFIG" "$BACKUP_CONFIG"

# Remove CORS headers from Nginx config
echo "🗑️  Removing CORS headers from Nginx config..."
sudo sed -i '/add_header.*Access-Control-Allow-Origin/d' "$NGINX_CONFIG"
sudo sed -i '/add_header.*Access-Control-Allow-Methods/d' "$NGINX_CONFIG"
sudo sed -i '/add_header.*Access-Control-Allow-Headers/d' "$NGINX_CONFIG"
sudo sed -i '/add_header.*Access-Control-Allow-Credentials/d' "$NGINX_CONFIG"
# Also remove CORP header if present
sudo sed -i '/add_header.*Cross-Origin-Resource-Policy/d' "$NGINX_CONFIG"

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
    echo ""
    echo "📝 CORS headers removed from Nginx. Express backend will now handle all CORS."
else
    echo "❌ Nginx configuration test failed!"
    echo "📦 Restoring backup..."
    sudo cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    exit 1
fi

