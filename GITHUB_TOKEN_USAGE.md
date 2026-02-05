# GitHub Token Usage in Release Workflow

## 🔐 How GitHub Token is Used

### 1. In GitHub Actions Workflow

**File**: `.github/workflows/release.yml`

**Location**: Line 70
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Purpose**: 
- Used by `electron-forge publish` to authenticate with GitHub API
- Required to create releases and upload assets
- Automatically provided by GitHub Actions

**How it works:**
1. GitHub Actions provides `GITHUB_TOKEN` automatically
2. Token has permissions to the repository where workflow runs
3. `electron-forge publish` uses this token to:
   - Create GitHub release
   - Upload `.nupkg`, `RELEASES`, `.exe`, `.msi` files
   - Update release metadata

### 2. In Verification Script

**File**: `.github/workflows/release.yml` (line 89)

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Purpose**:
- Used by `scripts/verify-release-assets.js`
- Verifies all required files are uploaded to release
- Checks release exists and has correct assets

### 3. In the App (Runtime - OTA Updates)

**File**: `src/main.ts` (lines 213-228)

```typescript
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN;
if (githubToken) {
  feedURLConfig.token = githubToken;
}
```

**Purpose**:
- Used by `electron-updater` to check for updates
- Required for private repository access
- Must be available at **runtime** (when app runs)

**Important**: This is different from the workflow token!
- Workflow token: Used during build to publish releases
- App token: Used at runtime to check for updates

## 🔄 Token Flow

### During Build (GitHub Actions)

```
GitHub Actions
  ↓
Provides GITHUB_TOKEN automatically
  ↓
electron-forge publish uses token
  ↓
Creates release and uploads files
```

### At Runtime (Packaged App)

```
User starts app
  ↓
App reads GITHUB_TOKEN from environment
  ↓
electron-updater uses token
  ↓
Checks GitHub API for updates
```

## ⚠️ Token Availability

### For Publishing (Build Time)

✅ **Always Available**:
- `${{ secrets.GITHUB_TOKEN }}` is automatically provided
- Works for both public and private repositories
- No additional setup needed

### For Updates (Runtime)

⚠️ **Must be Configured**:

**Option 1: Bundle in App** (Less Secure)
- Token is included in the packaged app
- Users can extract it
- Not recommended for production

**Option 2: Environment Variable** (User Sets)
- User sets `GITHUB_TOKEN` on their system
- App reads it at runtime
- More secure but requires user setup

**Option 3: Public Repository** (Recommended)
- Make repository public
- No token needed for update checks
- Simplest solution

## 🔍 Current Configuration

### Workflow Token (Build Time)
- ✅ Uses `${{ secrets.GITHUB_TOKEN }}`
- ✅ Automatically available
- ✅ Works for publishing releases

### App Token (Runtime)
- ⚠️ Checks: `GITHUB_TOKEN`, `GH_TOKEN`, `VITE_GITHUB_TOKEN`
- ⚠️ Not automatically bundled in app
- ⚠️ Needs to be set in environment or bundled

## 📝 Recommendations

### For Private Repositories

1. **Publishing**: Use default `GITHUB_TOKEN` (already configured) ✅
2. **Updates**: 
   - Option A: Make repository public (easiest)
   - Option B: Bundle token in app (less secure)
   - Option C: Use system environment variable (user setup required)

### For Public Repositories

1. **Publishing**: Use default `GITHUB_TOKEN` ✅
2. **Updates**: No token needed ✅

## 🧪 Testing Token

### Test Workflow Token

The workflow token is automatically tested when:
- Workflow runs
- Release is created
- Assets are uploaded

### Test App Token

1. **Set token in .env**:
   ```bash
   GITHUB_TOKEN=your_token_here
   ```

2. **Start app**:
   ```bash
   npm start
   ```

3. **Check logs**:
   - Should see: "GitHub token found - private repository updates enabled"
   - Should see: "Checking for updates..."
   - Should NOT see: 404 errors

## 🔗 Token Scopes Required

### For Publishing (Workflow)
- `repo` scope (full repository access)
- Automatically granted to `GITHUB_TOKEN`

### For Updates (App)
- `repo` scope (for private repositories)
- OR `public_repo` scope (if releases are public)

## 📚 References

- [GitHub Actions Token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [electron-updater Private Repos](https://www.electron.build/auto-update.html#private-github-update-repo)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
