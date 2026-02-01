---
name: electron-packaging
description: Fix Electron Forge packaging issues for Applaa. Use when building EXE/DMG fails, packaged app crashes, files are missing from build, native modules don't work in production, code signing fails, or updating forge.config.ts.
---

# Electron Packaging

Fix packaging issues with Electron Forge for Applaa.

## Key Files

- `forge.config.ts` - Main packaging configuration
- `vite.main.config.mts` - Vite externals (see native-module-externals skill)
- `entitlements.plist` - macOS security entitlements

## Common Issues & Fixes

### 1. Files Missing from Build

**Symptom**: "Cannot find module" or "File not found" in packaged app

**Fix**: Edit the `ignore()` function in `forge.config.ts`:

```typescript
const ignore = (file: string) => {
  // Return FALSE to INCLUDE the file
  if (file.startsWith("/your-folder")) {
    return false;  // Include this folder
  }
  
  return true;  // Exclude by default
};
```

**Currently included folders:**
- `/node_modules` - Dependencies
- `/drizzle` - Database migrations
- `/scaffold` - App scaffolding
- `/webapp-templates` - Web app templates
- `/expo-templates` - Mobile app templates
- `/src/prompts` - System prompts
- `/.vite` - Build output

### 2. Native Modules Not Working

**Symptom**: "Cannot find module" for native addon in production

**Fix**: Add to `asarUnpack` in `forge.config.ts`:

```typescript
packagerConfig: {
  asar: true,
  asarUnpack: [
    // Existing entries...
    "**/node_modules/your-native-module/**",
  ],
}
```

Also see the **native-module-externals** skill for Vite config.

### 3. macOS "App is Damaged" Error

**Symptom**: "App is damaged and can't be opened"

**Causes**:
1. Extended attributes from download
2. Code signing issue
3. Notarization missing

**Fix in forge.config.ts** (postPackage hook):

```typescript
hooks: {
  postPackage: async (config, options) => {
    if (process.platform === 'darwin') {
      // Remove extended attributes
      execSync(`xattr -cr "${options.outputPaths[0]}"`);
      
      // Staple notarization ticket
      execSync(`xcrun stapler staple "${options.outputPaths[0]}"`);
    }
  },
}
```

### 4. Windows Build Fails

**Symptom**: Build hangs or fails on Windows

**Common causes**:
- Native module rebuild requires Visual Studio Build Tools
- Path too long
- Symlinks not supported

**Fix**: Exclude problematic modules from rebuild:

```typescript
rebuildConfig: {
  onlyModules: [
    // Only rebuild these specific modules
    'better-sqlite3',
    // Don't include modules that fail on Windows
  ],
},
```

### 5. Symlink Issues (macOS)

**Symptom**: Native modules fail after packaging

**Fix**: prePackage hook replaces symlinks:

```typescript
hooks: {
  prePackage: async (config, options) => {
    const modulesToFix = ['better-sqlite3', 'bindings', 'file-uri-to-path', 'sqlite-vec'];
    
    for (const mod of modulesToFix) {
      const symlink = path.join('node_modules', mod);
      const target = fs.realpathSync(symlink);
      
      if (fs.lstatSync(symlink).isSymbolicLink()) {
        fs.unlinkSync(symlink);
        execSync(`cp -R "${target}" "${symlink}"`);
      }
    }
  },
}
```

## Build Commands

```bash
# Development build (faster, no signing)
npm run make

# Production build with signing
npm run make -- --arch=universal  # macOS universal binary

# E2E test build
E2E_TEST_BUILD=true npm run make
```

## Environment Variables for Signing

**macOS**:
```bash
APPLE_ID=your@email.com
APPLE_PASSWORD=app-specific-password  # or APPLE_APP_SPECIFIC_PASSWORD
```

**Windows** (if using EV cert):
```bash
WINDOWS_CERTIFICATE_FILE=path/to/cert.pfx
WINDOWS_CERTIFICATE_PASSWORD=password
```

## Debugging Packaged App

1. **Check what's included**:
   ```bash
   # After build, inspect the app contents
   # macOS:
   ls -la "out/Applaa-darwin-arm64/Applaa.app/Contents/Resources/app/"
   
   # Windows:
   dir "out\Applaa-win32-x64\resources\app"
   ```

2. **Check asar contents**:
   ```bash
   npx asar list out/Applaa-darwin-arm64/Applaa.app/Contents/Resources/app.asar
   ```

3. **Run packaged app with DevTools**:
   ```bash
   # Add to main.ts for debugging:
   mainWindow.webContents.openDevTools();
   ```

## Checklist for New Native Module

1. ✅ Add to `vite.main.config.mts` externals
2. ✅ Add to `forge.config.ts` asarUnpack
3. ✅ Add to `forge.config.ts` ignore() function (return false)
4. ✅ Add to `forge.config.ts` prePackage symlink fix (if needed)
5. ✅ Test in development: `npm start`
6. ✅ Test packaged: `npm run make` then run output

## Quick Reference: forge.config.ts Structure

```typescript
const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "com.applaa.app",
    asar: true,
    asarUnpack: [...],  // Native modules to unpack
    osxSign: {...},     // macOS signing
    osxNotarize: {...}, // macOS notarization
  },
  rebuildConfig: {
    onlyModules: [...], // Native modules to rebuild
  },
  makers: [...],        // DMG, EXE, etc.
  plugins: [
    new VitePlugin({...}),
  ],
  hooks: {
    prePackage: async () => {...},   // Fix symlinks
    postPackage: async () => {...},  // Remove xattrs, staple
    postMake: async () => {...},     // Post-build steps
  },
};
```
