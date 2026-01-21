# OTA (Over-The-Air) Update Architecture

## Overview

The Applaa application uses `electron-updater` to provide automatic updates from GitHub Releases. Updates are checked automatically and displayed to users via a bottom-left corner notification (similar to Cursor).

## How It Works

### 1. **Initialization** (`src/main.ts`)

When the app starts, if auto-updates are enabled in settings:

```typescript
// Configure electron-updater for GitHub Releases
autoUpdater.setFeedURL({
  provider: "github",
  owner: "Applaa-Builder",
  repo: "Applaa-Builder-v1",
  token: githubToken // Optional, for private repos
});

// Check for updates on startup and every 4 hours
autoUpdater.checkForUpdatesAndNotify();
```

### 2. **Update Check Flow**

1. **Startup Check**: App checks for updates when it launches
2. **Periodic Check**: Every 4 hours, the app automatically checks for new versions
3. **Manual Check**: Users can manually trigger a check via IPC

### 3. **Event Flow**

The main process (`src/main.ts`) listens to `electron-updater` events and sends IPC messages to the renderer:

- `update:checking` - Update check started
- `update:available` - New version found (sends version info)
- `update:not-available` - Already on latest version
- `update:download-progress` - Download progress updates (percent, speed, etc.)
- `update:downloaded` - Update downloaded and ready to install
- `update:error` - Error occurred during update process

### 4. **UI Notification** (`src/components/UpdateNotification.tsx`)

The renderer process listens for these IPC events and displays a notification in the bottom-left corner:

- **Update Available**: Shows version number and download button
- **Downloading**: Shows progress bar with percentage
- **Ready to Install**: Shows "Restart to Update" button

### 5. **Installation**

When user clicks "Restart to Update":
- IPC handler (`src/ipc/handlers/update_handlers.ts`) calls `autoUpdater.quitAndInstall()`
- App quits and installs the update
- App restarts with the new version

## Configuration

### GitHub Releases Setup

1. **Repository**: `Applaa-Builder/Applaa-Builder-v1`
2. **Tag Format**: `vX.X.X` (e.g., `v1.0.24`)
3. **Release Assets**: Windows EXE files are automatically uploaded by GitHub Actions

### Forge Configuration (`forge.config.ts`)

```typescript
{
  name: "@electron-forge/maker-squirrel",
  config: {
    publisherName: "Applaa Ltd", // Required for Windows OTA updates
  }
}
```

### Package Configuration

- **Version**: Set in `package.json` (e.g., `"version": "1.0.24"`)
- **Tag**: GitHub Actions automatically creates tag `v1.0.24` when publishing

## Update Process

1. **Developer**:
   - Updates version in `package.json`
   - Pushes to `release/ota-update-auto-trigger` branch
   - GitHub Actions builds EXE and publishes to GitHub Releases

2. **User's App**:
   - Checks GitHub Releases API for newer version
   - Compares version numbers
   - If newer version found, downloads the update
   - Shows notification to user
   - User clicks "Restart to Update"
   - App installs and restarts

## Security

- **Private Repositories**: Requires GitHub token (`GITHUB_TOKEN`, `GH_TOKEN`, or `VITE_GITHUB_TOKEN`)
- **Code Signing**: Windows EXEs can be signed (optional, configured in GitHub Actions)
- **Publisher Name**: Must match certificate for signed apps

## Troubleshooting

### Update Not Showing

1. Check if auto-updates are enabled in settings
2. Verify GitHub token is set (for private repos)
3. Check app logs: `%APPDATA%\Applaa\logs\main.log`
4. Verify release exists on GitHub with correct tag format

### Update Fails to Download

1. Check network connectivity
2. Verify GitHub Releases are accessible
3. Check for firewall/proxy issues
4. Review error logs

### Module Not Found Errors

Ensure these modules are:
- In `package.json` dependencies
- Externalized in `vite.main.config.mts`
- Added to `asarUnpack` in `forge.config.ts`
- Included in ignore function in `forge.config.ts`

## Files Involved

- `src/main.ts` - Main process update configuration
- `src/components/UpdateNotification.tsx` - UI notification component
- `src/ipc/handlers/update_handlers.ts` - IPC handlers for update actions
- `src/preload.ts` - IPC channel definitions
- `forge.config.ts` - Electron Forge configuration
- `.github/workflows/release.yml` - GitHub Actions build workflow
