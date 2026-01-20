# Quick Start: Test OTA Updates

## 🚀 Quick Steps

### 1. Push to New Branch

```bash
# Create branch
git checkout -b ota-update-test

# Add changes
git add src/main.ts forge.config.ts scripts/verify-release-assets.js

# Commit
git commit -m "Fix Windows OTA updates: repository config and publisherName"

# Push
git push origin ota-update-test
```

### 2. Trigger Release Workflow

1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml
2. Click **"Run workflow"**
3. Select branch: `ota-update-test`
4. Click **"Run workflow"**
5. Wait ~15-20 minutes for build

### 3. Verify Release

After workflow completes:
1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
2. Check latest release has:
   - ✅ `Applaa-X.X.X-full.nupkg` (REQUIRED for OTA)
   - ✅ `RELEASES` (REQUIRED for OTA)
   - ✅ `Applaa-X.X.X Setup.exe`
   - ✅ `ApplaaSetup.msi`

### 4. Test Update Check

**Option A: Run Test Script**
```bash
node scripts/check-all-releases.js
```

**Option B: Install EXE and Check Logs**
1. Download and install EXE from release
2. Start the app
3. Check logs: `%APPDATA%\applaa\logs\main.log`
4. Look for: "Checking for updates..." and update status

### 5. Expected Results

✅ **Success:**
- Repository accessible
- Releases found
- Update check works
- Logs show update status

❌ **Failure:**
- 404 error → Repository private (make public or add token)
- No releases → Run workflow to create release
- Missing files → Check workflow completed successfully

## 📋 Checklist

- [ ] Code pushed to branch
- [ ] Workflow triggered
- [ ] Release created
- [ ] .nupkg file present
- [ ] RELEASES file present
- [ ] Test script passes
- [ ] App checks for updates
- [ ] Logs show update status

## 🔧 Configuration Status

✅ **Fixed:**
- Repository: `Applaa-Builder/Applaa-Builder-v1`
- Publisher Name: `Applaa Ltd`
- Auto-updater logger fixed
- Verification script updated

## 📚 More Details

See `OTA_UPDATE_TESTING_GUIDE.md` for comprehensive testing guide.
