# Private Repository OTA Update Setup

## ✅ Configuration Complete

GitHub token support has been added to enable OTA updates from **private repositories**.

## 🔧 How It Works

The auto-updater now checks for a GitHub token in environment variables:
- `GITHUB_TOKEN` (primary)
- `GH_TOKEN` (alternative)

If a token is found, it's used to authenticate with GitHub API for private repository access.

## 📝 Setup Instructions

### Option 1: Development (.env file)

Add to your `.env` file:

```bash
# GitHub Personal Access Token for private repository OTA updates
GITHUB_TOKEN=your_github_personal_access_token_here
```

### Option 2: Production Build

For production builds, you have two options:

#### A. Environment Variable (Recommended for CI/CD)

Set the token as an environment variable during build:

```bash
export GITHUB_TOKEN=your_token_here
npm run make
```

#### B. Build-time Configuration

The token will be read from `process.env.GITHUB_TOKEN` at runtime. For packaged apps, you can:

1. **Set in GitHub Actions Secrets** (for automated builds)
2. **Embed in build process** (less secure, but works)

## 🔐 Security Considerations

### ⚠️ Important Security Notes

1. **Token Exposure**: The token will be accessible in the packaged app
   - For Electron apps, environment variables are bundled
   - Users with access to the app bundle can extract the token
   - **Recommendation**: Use a token with minimal permissions (read-only for releases)

2. **Token Permissions**: Create a token with minimal required scopes:
   - Minimum: `public_repo` (if releases are public)
   - For private repos: `repo` scope (read access to private repositories)
   - **Do NOT** use tokens with write/admin permissions

3. **Token Rotation**: 
   - Regularly rotate tokens
   - Revoke old tokens when no longer needed
   - Monitor token usage in GitHub

### Best Practices

1. **Create a dedicated token** for OTA updates only
2. **Use minimal permissions** (read-only for releases)
3. **Rotate tokens regularly** (every 90 days recommended)
4. **Monitor token usage** in GitHub settings
5. **Consider making releases public** if possible (more secure)

## 🧪 Testing

### Test with Token

1. **Add token to .env**:
   ```bash
   GITHUB_TOKEN=your_token_here
   ```

2. **Start the app**:
   ```bash
   npm start
   ```

3. **Check logs** (`%APPDATA%\applaa\logs\main.log`):
   - Should see: "GitHub token found - private repository updates enabled"
   - Should see: "Checking for updates..."
   - Should NOT see: 404 errors

### Test Script

Run the test script with token:

```bash
# Set token as environment variable
export GITHUB_TOKEN=your_token_here
node scripts/check-all-releases.js
```

## 📋 Token Creation Steps

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: "Applaa OTA Updates"
4. Select scopes:
   - ✅ `repo` (for private repositories)
   - OR `public_repo` (if releases are public)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again)
7. Add to `.env` file or GitHub Actions secrets

## 🔍 Verification

### Check if Token is Working

1. **Check logs on startup**:
   ```
   [main] GitHub token found - private repository updates enabled
   [main] Checking for updates...
   ```

2. **If token is missing**:
   ```
   [main] No GitHub token found - using public repository access
   ```

3. **If token is invalid**:
   - You'll see 401 (Unauthorized) errors in logs
   - Update check will fail

## 🚀 Production Deployment

### For GitHub Actions Builds

The token is already configured in the workflow:
- `.github/workflows/release.yml` uses `${{ secrets.GITHUB_TOKEN }}`
- This is the default GitHub Actions token
- For private repos, you may need a Personal Access Token

### For Local Production Builds

1. Set token in environment:
   ```bash
   export GITHUB_TOKEN=your_token_here
   npm run make
   ```

2. Or add to `.env` file (will be read during build)

## ⚙️ Configuration Details

### Code Location

**File**: `src/main.ts` (lines 209-230)

```typescript
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const feedURLConfig: any = {
  provider: "github",
  owner: "Applaa-Builder",
  repo: "Applaa-Builder-v1",
};

if (githubToken) {
  feedURLConfig.token = githubToken;
  logger.info("GitHub token found - private repository updates enabled");
}
```

### Environment Variables

- `GITHUB_TOKEN` - Primary token variable
- `GH_TOKEN` - Alternative token variable (for compatibility)

## ✅ Status

- [x] Token support added to auto-updater
- [x] Environment variable configuration
- [x] Logging for token detection
- [x] Documentation created
- [x] Security considerations documented

## 🎯 Next Steps

1. **Create GitHub Personal Access Token** (if not already done)
2. **Add token to .env file** for local testing
3. **Test update check** with private repository
4. **Verify logs** show token is being used
5. **For production**: Configure token in build process

## 📚 References

- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [electron-updater Private Repositories](https://www.electron.build/auto-update.html#private-github-update-repo)
- [GitHub API Authentication](https://docs.github.com/en/rest/overview/authenticating-to-the-rest-api)
