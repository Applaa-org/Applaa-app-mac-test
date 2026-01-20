# Post-Release OTA Update Test Instructions

## 🎯 After EXE is Built - Test OTA Updates

Once the GitHub Actions workflow completes and the EXE is built, follow these steps to test OTA updates.

## 📥 Step 1: Download and Install EXE

1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
2. Download: `Applaa-X.X.X Setup.exe` (latest release)
3. Install on a Windows machine
4. **Note the version number** (e.g., 1.0.9)

## 🔍 Step 2: Verify Installation

1. Start the app
2. Check if it launches successfully
3. Note the installed version

## 📋 Step 3: Check Update Mechanism

### Option A: Check Logs Immediately

1. **Open logs file**:
   ```
   %APPDATA%\applaa\logs\main.log
   ```

2. **Look for these messages**:
   ```
   [main] Auto-update enabled= true
   [main] GitHub token found - private repository updates enabled
   [main] Auto-update release channel= stable (allowPrerelease= false )
   [main] Checking for updates...
   ```

3. **Check for update result**:
   - If update available: `Update available: X.X.X`
   - If up to date: `Update not available. Current version is latest.`
   - If error: `Error in auto-updater: ...`

### Option B: Use Test Script

1. **Set GitHub token** (if testing from source):
   ```bash
   # Add to .env or set as environment variable
   GITHUB_TOKEN=your_token_here
   ```

2. **Run test script**:
   ```bash
   node scripts/check-all-releases.js
   ```

3. **Verify output**:
   - Should show repository exists
   - Should list releases
   - Should compare versions

## 🧪 Step 4: Test Update Detection

### Scenario A: You Have Latest Version

**Expected Behavior:**
- App checks for updates
- Logs show: "Update not available. Current version is latest."
- No update prompt

### Scenario B: Newer Version Available

**Expected Behavior:**
- App checks for updates
- Logs show: "Update available: X.X.X"
- Update downloads in background
- Logs show download progress
- Update installs on next app launch

## 📊 Step 5: Verify Token Authentication

**Check logs for:**
```
[main] GitHub token found - private repository updates enabled
```

**If you see:**
```
[main] No GitHub token found - using public repository access
```

**And repository is private:**
- Update check will fail with 404
- Need to ensure token is bundled in production build

## 🔧 Step 6: Test Update Download (if update available)

1. **Wait for download** (happens automatically)
2. **Check logs for progress**:
   ```
   Download speed: X bytesPerSecond - Downloaded Y% (transferred/total)
   ```

3. **Check for completion**:
   ```
   Update downloaded. Will quit and install on next app launch.
   ```

4. **Restart app** to install update

## ✅ Success Indicators

### ✅ Working Correctly:
- [ ] App starts without errors
- [ ] Logs show "GitHub token found" (if repo is private)
- [ ] Logs show "Checking for updates..."
- [ ] No 404 or authentication errors
- [ ] Update status is logged correctly
- [ ] Updates download (if available)
- [ ] Updates install on restart

### ❌ Not Working:
- [ ] 404 errors in logs
- [ ] 401 Unauthorized errors
- [ ] "Repository not found" messages
- [ ] No update check happening
- [ ] Token not detected (for private repos)

## 📝 Test Results Template

After testing, document results:

```
Test Date: [Date]
EXE Version: [Version from release]
Repository: Applaa-Builder/Applaa-Builder-v1
Repository Type: Private/Public

Test Results:
- [ ] Update check works
- [ ] Token authentication works (if private)
- [ ] Updates detected correctly
- [ ] Updates download successfully
- [ ] Updates install correctly

Logs Location: %APPDATA%\applaa\logs\main.log

Issues Found:
[Describe any issues]

Next Steps:
[What needs to be done]
```

## 🚨 Common Issues and Solutions

### Issue: 404 Error
**Cause**: Repository is private and token not available
**Solution**: 
- Ensure token is in GitHub Actions secrets
- For local testing: Add token to .env
- Verify token has `repo` scope

### Issue: Token Not Found in Logs
**Cause**: Token not bundled in production build
**Solution**:
- Token must be set during build process
- For GitHub Actions: Use `${{ secrets.GITHUB_TOKEN }}`
- For local builds: Set `GITHUB_TOKEN` environment variable

### Issue: Update Not Detected
**Cause**: Version number not higher or release not published
**Solution**:
- Verify release version is higher than installed version
- Ensure release is published (not draft)
- Check `.nupkg` and `RELEASES` files exist

## 📞 Next Steps After Testing

1. **If OTA works**: 
   - Document success
   - Merge to main branch
   - Create production release

2. **If OTA doesn't work**:
   - Check logs for specific errors
   - Verify token configuration
   - Test with public repository (if possible)
   - Review troubleshooting guide

## 🔗 Quick Links

- **Releases**: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
- **Actions**: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions
- **Logs**: `%APPDATA%\applaa\logs\main.log`

---

**After the EXE is built, follow these steps to test OTA updates! 🚀**
