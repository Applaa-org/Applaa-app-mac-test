# Testing OTA Updates with GitHub Token

## Quick Test Guide

### Step 1: Set GitHub Token

**Option A: Environment Variable (Temporary)**
```bash
# Windows PowerShell
$env:GITHUB_TOKEN="your_github_token_here"

# Windows CMD
set GITHUB_TOKEN=your_github_token_here

# Linux/Mac
export GITHUB_TOKEN=your_github_token_here
```

**Option B: Add to .env file**
```bash
# Add to .env file in project root
GITHUB_TOKEN=your_github_token_here
```

### Step 2: Test Repository Access

```bash
node scripts/check-all-releases.js
```

**Expected Output (with token):**
```
✓ Repository exists
  Name: Applaa-Builder-v1
  Private: Yes
  ...
✓ FOUND X RELEASE(S)
```

**Expected Output (without token):**
```
✗ Repository not found (404)
```

### Step 3: Test App Update Check

```bash
npm start
```

**Check logs** (`%APPDATA%\applaa\logs\main.log`):
- Should see: "GitHub token found - private repository updates enabled"
- Should see: "Checking for updates..."
- Should NOT see: 404 errors

## Token Requirements

### Required Scopes
- `repo` - Full control of private repositories (for private repos)
- OR `public_repo` - Access public repositories (if releases are public)

### Create Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select `repo` scope
4. Generate and copy token
5. Add to `.env` or environment variable

## Verification Checklist

- [ ] Token created with `repo` scope
- [ ] Token added to `.env` or environment variable
- [ ] Test script shows "✓ Repository exists"
- [ ] Test script shows releases (if any exist)
- [ ] App logs show "GitHub token found"
- [ ] App successfully checks for updates
- [ ] No 404 errors in logs

## Troubleshooting

### Issue: Still getting 404

**Possible causes:**
1. Token not set correctly
2. Token doesn't have `repo` scope
3. Token expired or revoked
4. Repository name is incorrect

**Solution:**
1. Verify token: `echo $GITHUB_TOKEN` (or `echo %GITHUB_TOKEN%` on Windows)
2. Check token scopes in GitHub settings
3. Create new token with correct scopes
4. Verify repository name matches exactly

### Issue: 401 Unauthorized

**Cause:** Token is invalid or expired

**Solution:**
1. Create new token
2. Update `.env` or environment variable
3. Restart app/script

### Issue: Token found but still can't access

**Cause:** Token doesn't have access to the repository

**Solution:**
1. Ensure token has `repo` scope
2. If using organization, ensure token has access to organization repos
3. Try creating token with organization access

## Security Note

⚠️ **Important**: The token will be bundled in the production app. Use a token with minimal permissions (read-only for releases).
