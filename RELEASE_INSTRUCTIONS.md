# 🚀 Release Instructions - OTA Update Ready

## ✅ Everything is Configured!

Your code is ready for release with Windows OTA update support for private repositories.

## 📋 Quick Release Steps

### 1. Push to Release Branch

```bash
# Create branch
git checkout -b release/ota-update-test

# Stage changes
git add src/main.ts forge.config.ts scripts/verify-release-assets.js scripts/check-all-releases.js

# Commit
git commit -m "Add Windows OTA update support: GitHub token, publisherName, repository fixes"

# Push
git push origin release/ota-update-test
```

### 2. Trigger GitHub Actions

1. **Go to**: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml
2. **Click**: "Run workflow" button
3. **Select branch**: `release/ota-update-test`
4. **Click**: "Run workflow"
5. **Wait**: ~15-20 minutes for build

### 3. After Build Completes

1. **Check Release**: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
2. **Verify Files**:
   - ✅ `Applaa-X.X.X-full.nupkg`
   - ✅ `RELEASES`
   - ✅ `Applaa-X.X.X Setup.exe`
   - ✅ `ApplaaSetup.msi`

## 🧪 Test OTA Updates

### After EXE is Built:

1. **Download EXE** from the release
2. **Install** on Windows
3. **Start the app**
4. **Check logs**: `%APPDATA%\applaa\logs\main.log`

### What to Look For:

**✅ Success:**
```
[main] GITHUB_TOKEN loaded: true
[main] Auto-update enabled= true
[main] GitHub token found - private repository updates enabled
[main] Checking for updates...
[main] Update available: X.X.X (or Update not available)
```

**❌ Issues:**
- 404 errors → Repository private, token needed
- 401 errors → Invalid token
- No update check → Configuration issue

## 🔐 GitHub Token Note

**Current Status:**
- Code checks for: `GITHUB_TOKEN`, `GH_TOKEN`, or `VITE_GITHUB_TOKEN`
- Your `.env` has: `VITE_GITHUB_TOKEN`
- **For GitHub Actions**: Uses `${{ secrets.GITHUB_TOKEN }}` automatically

**For Production:**
- GitHub Actions will use the default `GITHUB_TOKEN` secret
- This should work for private repositories
- If not, add a Personal Access Token to repository secrets

## 📊 Configuration Summary

✅ **Repository**: `Applaa-Builder/Applaa-Builder-v1`  
✅ **Publisher Name**: `Applaa Ltd`  
✅ **Token Support**: Enabled  
✅ **Auto-update**: Configured  
✅ **Release Workflow**: Ready  

## 🎯 Next Steps

1. **Push code** (commands above)
2. **Trigger workflow** (GitHub Actions)
3. **Wait for build** (~15-20 min)
4. **Download EXE** (from releases)
5. **Test OTA** (follow POST_RELEASE_OTA_TEST.md)

## 📚 Documentation

- `POST_RELEASE_OTA_TEST.md` - Detailed testing guide
- `RELEASE_AND_OTA_TEST_PLAN.md` - Complete plan
- `PRIVATE_REPO_OTA_SETUP.md` - Token setup
- `READY_FOR_RELEASE.md` - Configuration status

---

**Ready to release! Push the code and trigger the workflow! 🚀**
