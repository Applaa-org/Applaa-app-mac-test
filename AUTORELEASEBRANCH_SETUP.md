# Auto-Release Branch Setup

## ✅ Workflow Updated

The release workflow now **auto-triggers** when code is pushed to:
- `autoreleasebranch` 
- `release/**` (any branch starting with `release/`)

## 🔧 How It Works

### Workflow Triggers

**File**: `.github/workflows/release.yml`

```yaml
on:
  workflow_dispatch:  # Manual trigger (still available)
  push:
    branches:
      - autoreleasebranch
      - release/**
```

**What this means:**
- ✅ Push to `autoreleasebranch` → Workflow starts automatically
- ✅ Push to `release/ota-update-test` → Workflow starts automatically
- ✅ Manual trigger still works via GitHub UI

### GitHub Token Usage

The workflow uses `${{ secrets.GITHUB_TOKEN }}` which is:

1. **Automatically provided by GitHub Actions**
   - No setup required
   - Has permissions to the repository
   - Works for publishing releases

2. **Used in two places:**

   **A. Publishing Releases** (line 70):**
   ```yaml
   env:
     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
   - Used by `electron-forge publish` to upload release assets
   - Required for creating GitHub releases

   **B. Verification Script** (line 89):
   ```yaml
   env:
     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
   - Used by `verify-release-assets.js` to check release assets
   - Verifies all required files are uploaded

3. **For Private Repositories:**
   - Default `GITHUB_TOKEN` should work for the repository it's running in
   - If issues occur, you may need a Personal Access Token in secrets

## 🚀 Usage

### Option 1: Push to autoreleasebranch

```bash
# Create or switch to autoreleasebranch
git checkout -b autoreleasebranch
# OR if branch exists:
git checkout autoreleasebranch

# Add your changes
git add src/main.ts forge.config.ts .github/workflows/release.yml

# Commit
git commit -m "Add Windows OTA update support"

# Push - workflow will start automatically!
git push origin autoreleasebranch
```

### Option 2: Push to release branch

```bash
# Create release branch
git checkout -b release/ota-update-test

# Add changes
git add src/main.ts forge.config.ts .github/workflows/release.yml

# Commit
git commit -m "Add Windows OTA update support"

# Push - workflow will start automatically!
git push origin release/ota-update-test
```

### Option 3: Manual Trigger (Still Available)

1. Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml
2. Click "Run workflow"
3. Select branch
4. Click "Run workflow"

## 📋 Workflow Steps

1. **Checkout code** - Gets the code from the branch
2. **Setup Node.js** - Installs Node.js 20
3. **Install dependencies** - Runs `npm ci`
4. **Code signing** (Windows) - Signs the EXE
5. **Publish** - Runs `npm run publish` which:
   - Builds the app
   - Creates installers (EXE, MSI, etc.)
   - Publishes to GitHub Releases
   - Uses `GITHUB_TOKEN` for authentication

6. **Verify assets** - Checks all required files are uploaded

## 🔐 Token Configuration

### For GitHub Actions (Automatic)

The workflow uses `${{ secrets.GITHUB_TOKEN }}` which:
- ✅ Is automatically available
- ✅ Has access to the repository
- ✅ Can create releases and upload assets
- ✅ Works for both public and private repositories

### For App Runtime (OTA Updates)

The **packaged app** needs a token to check for updates from private repositories:

**Current Configuration:**
- App checks: `GITHUB_TOKEN`, `GH_TOKEN`, or `VITE_GITHUB_TOKEN`
- Token must be available at **runtime** (when app runs)
- For packaged apps, token needs to be bundled

**Options:**
1. **Bundle token during build** (less secure)
2. **Use system environment variable** (user sets it)
3. **Make repository public** (no token needed)

## ⚠️ Important Notes

### Token for Publishing vs. Token for Updates

**Two different tokens for two different purposes:**

1. **Publishing Token** (`GITHUB_TOKEN` in workflow):
   - Used by GitHub Actions to publish releases
   - Provided automatically by GitHub
   - Only needed during build/publish

2. **Update Check Token** (in app):
   - Used by the app to check for updates
   - Must be available at runtime
   - Needed for private repository access

### Default GITHUB_TOKEN Limitations

The default `GITHUB_TOKEN` in GitHub Actions:
- ✅ Works for the repository it's running in
- ✅ Can create releases and upload assets
- ✅ Works for private repositories (within the same repo)
- ❌ Cannot trigger other workflows (by design)
- ❌ May have limited permissions for organization repos

If you encounter issues with private repositories, you may need to:
1. Add a Personal Access Token to repository secrets
2. Use that token instead of the default `GITHUB_TOKEN`

## 🧪 Testing

### Test Auto-Trigger

1. **Push to autoreleasebranch**:
   ```bash
   git push origin autoreleasebranch
   ```

2. **Check GitHub Actions**:
   - Go to: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions
   - Should see workflow running automatically
   - No manual trigger needed!

3. **Wait for build** (~15-20 minutes)

4. **Verify release**:
   - Check: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases
   - Should see new release with all assets

## 📊 Configuration Summary

✅ **Auto-trigger**: Enabled for `autoreleasebranch` and `release/**`  
✅ **GitHub Token**: Uses `${{ secrets.GITHUB_TOKEN }}` automatically  
✅ **Publishing**: Configured for GitHub Releases  
✅ **Verification**: Assets are verified after build  

## 🎯 Next Steps

1. **Push to autoreleasebranch** (workflow starts automatically)
2. **Wait for build** (~15-20 minutes)
3. **Download EXE** from release
4. **Test OTA updates** (follow POST_RELEASE_OTA_TEST.md)

---

**Workflow is now configured to auto-trigger on push to autoreleasebranch! 🚀**
