# Fix Nginx CORS Duplicate Headers Issue

## Problem
Nginx is adding CORS headers in addition to Express, causing duplicate `Access-Control-Allow-Origin: *, *` headers.

## Solution: Remove CORS headers from Nginx

Express backend already handles CORS, so Nginx should not add its own headers.

## Manual Fix (Run on VPS)

SSH into your VPS and run these commands:

```bash
ssh applaa-app@168.231.116.44

# 1. Backup the config
sudo cp /etc/nginx/sites-available/applaa-backend.conf /etc/nginx/sites-available/applaa-backend.conf.backup

# 2. Remove CORS headers from Nginx
sudo sed -i '/add_header.*Access-Control-Allow-Origin/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Methods/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Headers/d' /etc/nginx/sites-available/applaa-backend.conf
sudo sed -i '/add_header.*Access-Control-Allow-Credentials/d' /etc/nginx/sites-available/applaa-backend.conf

# 3. Test the configuration
sudo nginx -t

# 4. If test passes, reload Nginx
sudo systemctl reload nginx

# 5. Verify it's fixed
curl -H "Origin: http://localhost:5173" http://168.231.116.44:3001/api/todos -v
```

## What to Look For

After running the fix, check the response headers. You should see:
- ✅ Only ONE `Access-Control-Allow-Origin: *` header (from Express)
- ❌ NO duplicate headers

## Automatic Fix

The deployment script has been updated to automatically fix this on future deployments.

