# OTA Update Testing Guide

## Overview
This guide will help you:
1. Push the updated code to a new branch
2. Build an EXE through GitHub Actions
3. Test the OTA update mechanism

## Step 1: Push Code to New Branch

### Create and Push Branch

```bash
# Make sure all changes are committed
git status

# Create a new branch (e.g., ota-update-test)
git checkout -b ota-update-test

# Add all modified files
git add src/main.ts forge.config.ts

# Commit the changes
git commit -m "Fix Windows OTA updates: Add publisherName and fix repository config"

# Push to GitHub
git push origin ota-update-test
```

### Files Changed for OTA Updates
- ✅ `src/main.ts` - Fixed repository to `Applaa-Builder/Applaa-Builder-v1`
- ✅ `forge.config.ts` - Added `publisherName: "Applaa Ltd"` and fixed repository
- ✅ Auto-updater logger configuration fixed

## Step 2: Trigger GitHub Actions Release

### Option A: Manual Trigger (Recommended)

1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml
2. Click **"Run workflow"** button
3. Select your branch: `ota-update-test` (or your branch name)
4. Click **"Run workflow"**
5. Wait for the build to complete (takes ~10-20 minutes)

### Option B: Create Release Tag

```bash
# Create a release tag
git tag v1.0.9
git push origin v1.0.9
```

Note: The current workflow uses `workflow_dispatch`, so manual trigger is needed.

## Step 3: Verify Release Assets

After the workflow completes, verify the release includes:

### Required Files for Windows OTA Updates:
1. ✅ `Applaa-X.X.X-full.nupkg` - NuGet package (required)
2. ✅ `RELEASES` - Update manifest file (required)
3. ✅ `Applaa-X.X.X Setup.exe` - Installer
4. ✅ `ApplaaSetup.msi` - MSI installer

### Check Release on GitHub:
1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
2. Find your latest release
3. Verify all Windows files are present

## Step 4: Test OTA Updates

### Test Scenario 1: Install Older Version

1. **Download an older version** (if available) or use version 1.0.8
2. **Install it** on a Windows machine
3. **Start the app** - it should check for updates automatically
4. **Check logs** at: `%APPDATA%\applaa\logs\main.log`
   - Look for: "Checking for updates..."
   - Look for: "Update available: X.X.X" or "Update not available"

### Test Scenario 2: Manual Update Check

1. **Install the EXE** from the release
2. **Start the app**
3. **Check console/logs** for update check messages
4. **Verify** the app checks: `https://github.com/Applaa-Builder/Applaa-Builder-v1/releases`

### Test Scenario 3: Use Test Script

Run the test script to check if updates are available:

```bash
node scripts/check-all-releases.js
```

This will:
- Check if repository is accessible
- List all releases
- Compare current version (1.0.8) with latest
- Verify Windows update files (.nupkg and RELEASES)

## Step 5: Verify Update Detection

### Expected Behavior

✅ **Working:**
- App checks for updates on startup
- Logs show: "Checking for updates..."
- If update available: "Update available: X.X.X"
- If no update: "Update not available. Current version is latest."

❌ **Not Working:**
- Error: "Repository not found" → Repository is private or wrong name
- Error: "No releases found" → No releases published yet
- Error: "Network error" → Internet connection issue

### Check Logs

**Location:** `%APPDATA%\applaa\logs\main.log`

**Look for:**
```
[main] Auto-update enabled= true
[main] Auto-update release channel= stable (allowPrerelease= false )
[main] Checking for updates...
[main] Update available: 1.0.9
```

Or if up to date:
```
[main] Update not available. Current version is latest.
```

## Step 6: Troubleshooting

### Issue: Repository Not Found (404)

**Cause:** Repository is private or name is wrong

**Solution:**
1. Make repository public, OR
2. Add GitHub token to auto-updater config

### Issue: No Releases Found

**Cause:** No releases have been published

**Solution:**
1. Run the release workflow
2. Verify release is published (not draft)
3. Check release includes .nupkg and RELEASES files

### Issue: Update Not Detected

**Cause:** Version number mismatch or release not published

**Solution:**
1. Verify release version number matches expected format
2. Check release is published (not draft)
3. Verify .nupkg and RELEASES files are in release assets

## Step 7: Verify Configuration

### Current Configuration

**Repository:** `Applaa-Builder/Applaa-Builder-v1` ✅
**Publisher Name:** `Applaa Ltd` ✅
**Auto-update:** Enabled by default ✅
**Update Check:** On startup + every 4 hours ✅

### Files to Verify

1. **src/main.ts** (lines 212-216):
   ```typescript
   autoUpdater.setFeedURL({
     provider: "github",
     owner: "Applaa-Builder",
     repo: "Applaa-Builder-v1",
   });
   ```

2. **forge.config.ts** (lines 142-152):
   ```typescript
   {
     name: "@electron-forge/maker-squirrel",
     config: {
       publisherName: "Applaa Ltd", // ✅ Required for OTA
       // ... other config
     },
   }
   ```

## Step 8: Test Update Download and Install

Once an update is detected:

1. **Wait for download** - Check logs for download progress
2. **Verify download** - Update should download automatically
3. **Restart app** - Update installs on next app launch
4. **Verify version** - Check new version is installed

## Quick Test Checklist

- [ ] Code pushed to new branch
- [ ] GitHub Actions workflow triggered
- [ ] Release created with Windows files
- [ ] .nupkg file present in release
- [ ] RELEASES file present in release
- [ ] Test script runs successfully
- [ ] App checks for updates on startup
- [ ] Logs show update check messages
- [ ] Update detection works (if newer version available)

## Next Steps After Testing

1. **If OTA updates work:**
   - Merge branch to main/master
   - Create production release
   - Monitor update adoption

2. **If OTA updates don't work:**
   - Check logs for specific errors
   - Verify repository visibility (public/private)
   - Ensure releases are published (not drafts)
   - Verify .nupkg and RELEASES files are present

## Support

If you encounter issues:
1. Check `UPDATE_CHECK_RESULTS.md` for detailed test results
2. Check `WINDOWS_OTA_UPDATE_STATUS.md` for configuration status
3. Review logs at `%APPDATA%\applaa\logs\main.log`
4. Run test scripts: `node scripts/check-all-releases.js`
