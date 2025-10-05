# WordPress/Hostinger Deployment System

## Overview
Deploy Applaa-generated apps to your WordPress/Hostinger hosting with automatic subdomain setup. This complements the existing Vercel publishing flow and lets you host apps under your own domain, e.g., `app-123.yourdomain.com`.

## Prerequisites

### 1) Hostinger / cPanel
- cPanel or hPanel access (Hostinger)
- Ability to create subdomains (DNS managed at Hostinger)
- FTP/SFTP credentials (or SSH if available)
- Optional: Hostinger API token

### 2) WordPress
- WordPress site running on the same hosting
- REST API enabled (default)
- Optional: Small helper plugin for deployment bookkeeping

## Architecture

```
Applaa Builder → Build App → Deploy via one of:
  1) FTP/SFTP to Hostinger subdomain (recommended to start)
  2) SSH + Git pull on server (advanced)
  3) WordPress REST endpoint (optional helper plugin)

Result → https://app-<id>.yourdomain.com serving the built app
```

## Deployment Methods

- Method 1: FTP/SFTP Deployment (Recommended)
  - Pros: Simple, works on all shared hosting
  - Cons: Slower than SSH/Git
  - Best For: Small-to-medium apps

- Method 2: SSH + Git (Advanced)
  - Pros: Fast, versioned
  - Cons: Requires SSH access and server git setup

- Method 3: WordPress Plugin API
  - Pros: Integrated into WP admin/REST
  - Cons: More moving parts; optional

## Configuration

### hostinger-config.json (project root)
```json
{
  "hostinger": {
    "apiKey": "your-hostinger-api-key",
    "mainDomain": "yourdomain.com",
    "ftpHost": "ftp.yourdomain.com",
    "ftpUser": "your-ftp-username",
    "ftpPassword": "your-ftp-password",
    "sshHost": "ssh.yourdomain.com",
    "sshUser": "your-ssh-username",
    "sshKey": "/path/to/ssh/key",
    "webRoot": "/public_html",
    "subdomainPrefix": "app"
  },
  "wordpress": {
    "siteUrl": "https://yourdomain.com",
    "apiUrl": "https://yourdomain.com/wp-json/applaa/v1",
    "apiKey": "your-wordpress-api-key",
    "deploymentEndpoint": "/deploy"
  },
  "deployment": {
    "method": "ftp",
    "autoSSL": true,
    "compressionEnabled": true,
    "cacheEnabled": true
  }
}
```

### .env
```bash
# Hostinger / hPanel
HOSTINGER_API_KEY=your_hostinger_api_key
HOSTINGER_MAIN_DOMAIN=yourdomain.com
HOSTINGER_FTP_HOST=ftp.yourdomain.com
HOSTINGER_FTP_USER=your_ftp_username
HOSTINGER_FTP_PASSWORD=your_ftp_password

# Optional SSH
HOSTINGER_SSH_HOST=ssh.yourdomain.com
HOSTINGER_SSH_USER=your_ssh_user
HOSTINGER_SSH_KEY=~/.ssh/id_rsa

# WordPress REST (optional helper)
WORDPRESS_DEPLOY_URL=https://yourdomain.com/wp-json/applaa/v1
WORDPRESS_DEPLOY_KEY=your_wordpress_api_key

# Deployment method: ftp | sftp | ssh | wordpress
DEPLOY_METHOD=ftp
```

## Deployment Flow

1) Build the app (web output)
```bash
npm run build
```

2) Create subdomain
- Subdomain format: `{subdomainPrefix}-{appId}.yourdomain.com` (e.g., `app-243.yourdomain.com`)
- Document root: `/public_html/{subdomain}`

3) Upload files
- FTP/SFTP upload built output to `/public_html/{subdomain}/`

4) SSL
- Enable Let's Encrypt for the subdomain in hPanel

5) Bookkeeping
- Store deployment URL against the app in Applaa DB
- Optional: Ping WP REST endpoint to register deployment

## IPC Handler Sketch (FTP Upload)

```ts
// src/ipc/handlers/hostinger_handlers.ts (sketch)
import * as path from 'node:path';
import * as ftp from 'basic-ftp';

export async function deployToHostingerViaFTP(params: {
  appId: number;
  appName: string;
  appPath: string; // local folder with build
  subdomain: string; // e.g., app-243
}) {
  const remotePath = `/public_html/${params.subdomain}/`;
  const localPath = path.join(params.appPath, 'dist'); // or 'out'

  const client = new ftp.Client();
  try {
    await client.access({
      host: process.env.HOSTINGER_FTP_HOST!,
      user: process.env.HOSTINGER_FTP_USER!,
      password: process.env.HOSTINGER_FTP_PASSWORD!,
      secure: true,
    });

    await client.ensureDir(remotePath);
    await client.clearWorkingDir();
    await client.uploadFromDir(localPath, remotePath);

    return { success: true, url: `https://${params.subdomain}.${process.env.HOSTINGER_MAIN_DOMAIN}` };
  } finally {
    client.close();
  }
}
```

## Subdomain Creation (API)

If Hostinger API access is available, automate subdomain creation:

```ts
async function createSubdomain(sub: string) {
  const res = await fetch('https://api.hostinger.com/v1/domains/subdomains', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HOSTINGER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: process.env.HOSTINGER_MAIN_DOMAIN,
      subdomain: sub,
      documentRoot: `/public_html/${sub}`,
    }),
  });
  if (!res.ok) throw new Error('Failed to create subdomain');
  return res.json();
}
```

## Optional: WordPress Plugin (REST)

```php
<?php
/**
 * Plugin Name: Applaa Deployment Manager
 * Description: Registers deployments from Applaa Builder
 */

add_action('rest_api_init', function() {
  register_rest_route('applaa/v1', '/deploy', array(
    'methods' => 'POST',
    'callback' => 'applaa_handle_deploy',
    'permission_callback' => '__return_true'
  ));
});

function applaa_handle_deploy($request) {
  $app_id = sanitize_text_field($request->get_param('appId'));
  $url = esc_url_raw($request->get_param('url'));
  // Store mapping in WP options or a custom table
  update_option('applaa_app_'.$app_id.'_url', $url);
  return new WP_REST_Response([ 'success' => true, 'url' => $url ], 200);
}
```

## UI Integration (Publish Panel)

Add a deployment method selector and a form for Hostinger credentials.

```tsx
// Pseudocode snippet for PublishPanel
// <select value={method} onChange={...}>
//   <option value="vercel">Vercel</option>
//   <option value="hostinger">Hostinger/WordPress</option>
// </select>
// {method === 'hostinger' && <HostingerDeploymentForm ... />}
```

## Security
- Store credentials in `.env` only
- Prefer SFTP over FTP when available
- Rotate credentials; use app-specific passwords if possible
- Enable HTTPS (Let's Encrypt) for each subdomain

## Monitoring

```ts
async function checkDeploymentHealth(subdomain: string) {
  const url = `https://${subdomain}.${process.env.HOSTINGER_MAIN_DOMAIN}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { isOnline: res.ok, status: res.status };
  } catch {
    return { isOnline: false, status: 0 };
  }
}
```

## Next Steps
1) Install deps: `npm i basic-ftp ssh2-sftp-client node-ssh`
2) Add IPC handlers for Hostinger deployment
3) Add UI flow in Publish Panel
4) Test on a sample subdomain
5) (Optional) Add WP plugin for bookkeeping

## FAQ
- Q: Can I use custom subdomain names?
  - A: Yes. Use app slug or name; ensure it's DNS-safe and unique.
- Q: Can I deploy Expo web builds?
  - A: Yes. Use Expo web output (static) and upload the `dist`/`out` folder.


