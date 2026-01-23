# Embedded Environment Variables Solution

## Overview

This solution embeds environment variables (like `GITHUB_TOKEN`) into the packaged `.exe` file, allowing the app to access them at runtime for features like OTA updates.

## How It Works

### Build Process Flow

1. **Local Build (`npm run make`)**:
   - Runs `embed-env-vars.js` → reads from `.env` file
   - Generates `src/config/embedded-env.ts`
   - Vite compiles TypeScript (includes embedded-env.ts)
   - Electron Forge packages the app

2. **GitHub Actions Build (`npm run publish`)**:
   - Sets environment variables from GitHub Secrets
   - Runs `embed-env-vars.js` → reads from `process.env`
   - Generates `src/config/embedded-env.ts`
   - Vite compiles TypeScript (includes embedded-env.ts)
   - Electron Forge packages and publishes the app

### Runtime Usage

The app loads environment variables in this priority order:
1. **Embedded config** (from build time) - `getGitHubToken()`
2. **Process environment** - `process.env.GITHUB_TOKEN`
3. **Fallback** - `process.env.GH_TOKEN` or `process.env.VITE_GITHUB_TOKEN`

## Files Modified

### Created Files
- `scripts/embed-env-vars.js` - Script that generates embedded config
- `src/config/embedded-env.ts` - Generated file with embedded variables

### Modified Files
- `src/main.ts` - Updated to use `getGitHubToken()` from embedded config
- `package.json` - Added `embed-env` script, updated `make` and `publish`
- `.github/workflows/release.yml` - Added comment about env vars

## Environment Variables Embedded

The following variables are embedded (if available):
- `GITHUB_TOKEN`, `GH_TOKEN`, `VITE_GITHUB_TOKEN` - For OTA updates
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc. - For Supabase
- `SENTRY_DSN` - For error tracking
- `AZURE_API_KEY`, etc. - For Azure OpenAI
- And others (see `scripts/embed-env-vars.js`)

## Setup Instructions

### For Local Development

1. Create `.env` file in project root (already exists)
2. Add your environment variables:
   ```env
   GITHUB_TOKEN=your_token_here
   VITE_GITHUB_TOKEN=your_token_here
   ```
3. Build locally:
   ```bash
   npm run make
   ```

### For GitHub Actions

1. Add secrets to GitHub repository:
   - Go to: Settings → Secrets and variables → Actions
   - Add `GITHUB_TOKEN` secret (or use existing `GITHUB_TOKEN`)

2. The workflow automatically embeds secrets during build

## Security Notes

⚠️ **Important**: Embedded environment variables are visible in the packaged app. Anyone can extract them.

**Recommendations**:
- Use tokens with minimal permissions (e.g., `public_repo` scope only)
- Consider making the repository public if possible
- Don't embed highly sensitive secrets

## Troubleshooting

### OTA Updates Not Working

1. Check if token is embedded:
   ```bash
   # After building, check the generated file
   cat src/config/embedded-env.ts
   ```

2. Check app logs:
   ```powershell
   Select-String -Path "$env:APPDATA\applaa\logs\main.log" -Pattern "GitHub token"
   ```

3. Verify token in GitHub Actions:
   - Check workflow logs for "GitHub token: Found"
   - Ensure `GITHUB_TOKEN` secret is set in repository

### Token Not Found

- **Local**: Check `.env` file exists and has `GITHUB_TOKEN` or `VITE_GITHUB_TOKEN`
- **CI**: Verify `GITHUB_TOKEN` secret is set in GitHub repository settings

## Testing

1. **Test locally**:
   ```bash
   npm run embed-env
   # Check src/config/embedded-env.ts was generated
   npm run make
   ```

2. **Test in packaged app**:
   - Install the `.exe`
   - Check logs: `%APPDATA%\applaa\logs\main.log`
   - Look for: "GitHub token found - private repository updates enabled"

## Maintenance

To add new environment variables:

1. Edit `scripts/embed-env-vars.js`
2. Add variable name to `envVarsToEmbed` array
3. Rebuild the app

The variable will be automatically embedded if it exists in `.env` (local) or GitHub Secrets (CI).
