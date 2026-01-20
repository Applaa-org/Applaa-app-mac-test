# Release and OTA Update Test Plan

## 🎯 Objective
1. Push code to a separate branch
2. Build EXE through GitHub Actions
3. Test OTA updates with the new EXE

## ✅ Pre-Release Checklist

### Configuration Status

- [x] **Repository Configuration**: `Applaa-Builder/Applaa-Builder-v1`
- [x] **Publisher Name**: `Applaa Ltd` (for Windows OTA)
- [x] **GitHub Token Support**: Added for private repository
- [x] **Auto-updater**: Configured with token support
- [x] **Release Workflow**: Ready to build

### Files Ready for Commit

1. `src/main.ts` - GitHub token support + repository fix
2. `forge.config.ts` - Publisher name + repository fix
3. `scripts/verify-release-assets.js` - Updated for Applaa
4. `scripts/check-all-releases.js` - Token support added

## 📋 Step-by-Step Release Process

### Step 1: Verify GitHub Token in .env

Check your `.env` file has:
```bash
GITHUB_TOKEN=your_github_token_here
```

**Note**: The token will be read from environment during build. For GitHub Actions, it uses `${{ secrets.GITHUB_TOKEN }}` automatically.

### Step 2: Create and Push Release Branch

```bash
# Create new branch
git checkout -b release/ota-update-test

# Add all changes
git add src/main.ts forge.config.ts scripts/verify-release-assets.js scripts/check-all-releases.js

# Commit
git commit -m "Add Windows OTA update support: GitHub token, publisherName, and repository fixes"

# Push to GitHub
git push origin release/ota-update-test
```

### Step 3: Trigger GitHub Actions Release

1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml
2. Click **"Run workflow"**
3. Select branch: `release/ota-update-test`
4. Click **"Run workflow"**
5. Wait for build to complete (~15-20 minutes)

### Step 4: Verify Release Assets

After workflow completes:

1. **Check Release Page**:
   - Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
   - Find the latest release

2. **Verify Required Files**:
   - ✅ `Applaa-X.X.X-full.nupkg` (REQUIRED for OTA)
   - ✅ `RELEASES` (REQUIRED for OTA)
   - ✅ `Applaa-X.X.X Setup.exe`
   - ✅ `ApplaaSetup.msi`

3. **Run Verification Script**:
   ```bash
   node scripts/verify-release-assets.js
   ```

## 🧪 OTA Update Testing Plan

### Test Scenario 1: Install Older Version

**Prerequisites:**
- Have version 1.0.8 (or older) installed
- New release with higher version (e.g., 1.0.9) published

**Steps:**
1. Install older version EXE on Windows machine
2. Ensure `.env` has `GITHUB_TOKEN` set (or token is in packaged app)
3. Start the app
4. Check logs: `%APPDATA%\applaa\logs\main.log`
5. Look for update check messages

**Expected Results:**
```
[main] Auto-update enabled= true
[main] GitHub token found - private repository updates enabled
[main] Checking for updates...
[main] Update available: 1.0.9
```

### Test Scenario 2: Install Latest Version

**Steps:**
1. Install the latest EXE from the release
2. Start the app
3. Check logs

**Expected Results:**
```
[main] Auto-update enabled= true
[main] GitHub token found - private repository updates enabled
[main] Checking for updates...
[main] Update not available. Current version is latest.
```

### Test Scenario 3: Manual Update Check

**Steps:**
1. Install EXE
2. Start app
3. Wait for automatic update check (on startup)
4. Or wait for periodic check (every 4 hours)

**Verify:**
- Update check happens automatically
- No errors in logs
- Token authentication works

## 📊 Testing Checklist

### Pre-Build
- [ ] Code pushed to release branch
- [ ] GitHub token configured (in .env or GitHub Secrets)
- [ ] All changes committed

### Post-Build
- [ ] Release created on GitHub
- [ ] `.nupkg` file present in release
- [ ] `RELEASES` file present in release
- [ ] EXE installer works
- [ ] MSI installer works

### OTA Testing
- [ ] Older version installed
- [ ] App starts successfully
- [ ] Logs show "GitHub token found"
- [ ] Logs show "Checking for updates..."
- [ ] Update detected (if newer version available)
- [ ] Update downloads (if available)
- [ ] Update installs on next launch

## 🔍 Verification Commands

### Check Release Assets
```bash
node scripts/check-all-releases.js
```

### Check with Token
```bash
# Set token (if not in .env)
export GITHUB_TOKEN=your_token_here
node scripts/check-all-releases.js
```

### Check App Logs
```bash
# Windows
type "%APPDATA%\applaa\logs\main.log" | findstr "update"
```

## 📝 Log Messages to Look For

### ✅ Success Indicators
- `GitHub token found - private repository updates enabled`
- `Checking for updates...`
- `Update available: X.X.X`
- `Update downloaded. Will quit and install on next app launch.`

### ❌ Error Indicators
- `Error in auto-updater: ...`
- `Repository not found (404)`
- `401 Unauthorized` (invalid token)
- `No GitHub token found - using public repository access` (if repo is private)

## 🚨 Troubleshooting

### Issue: Release not found
**Solution**: Ensure release is published (not draft)

### Issue: 404 errors
**Solution**: 
- Verify repository name is correct
- Check if repository is private (needs token)
- Verify token has `repo` scope

### Issue: Token not working
**Solution**:
- Verify token is in `.env` file
- Check token has correct scopes
- Ensure token hasn't expired
- For production: Token must be bundled in app

### Issue: Update not detected
**Solution**:
- Verify version number is higher
- Check release is published (not draft)
- Verify `.nupkg` and `RELEASES` files exist
- Check logs for specific errors

## 📋 Post-Release Actions

After EXE is built and released:

1. **Download EXE** from GitHub release
2. **Install on test machine**
3. **Check logs** for update check
4. **Verify OTA mechanism works**
5. **Report results**

## 🎯 Success Criteria

OTA updates are working if:
- ✅ App checks for updates on startup
- ✅ No 404 or authentication errors
- ✅ Updates are detected when available
- ✅ Updates download successfully
- ✅ Updates install on next app launch

## 📚 Related Documentation

- `PRIVATE_REPO_OTA_SETUP.md` - Token setup guide
- `TEST_WITH_TOKEN.md` - Testing with token
- `FINAL_VERIFICATION_CHECKLIST.md` - Pre-release checklist
- `OTA_UPDATE_TESTING_GUIDE.md` - Comprehensive testing guide

---

**Ready to release! 🚀**

Follow the steps above to build the EXE and test OTA updates.
