---
name: native-module-externals
description: Fix native module loading errors in Applaa's Electron app. Use when encountering errors like "native addon not found", "extension not found", module resolution errors for packages like sharp, sqlite-vec, better-sqlite3, keytar, onnxruntime-node, or any native Node.js addon. Also use when adding a new native module dependency to the project.
---

# Native Module Externals

Fix for native modules that fail to load in Electron because Vite bundles them incorrectly.

## Problem

Native modules (with `.node` binaries) fail when Vite bundles them because:
1. Path resolution points to bundle output instead of `node_modules`
2. Platform-specific packages (e.g., `sharp-darwin-arm64`) aren't resolved correctly
3. Native addons can't be found at runtime

## Quick Fix Checklist

When adding a native module or fixing "module not found" errors:

1. **Add to `vite.main.config.mts` externals** (required)
2. **Add to `forge.config.ts` asarUnpack** (for packaged app)
3. **Add to `forge.config.ts` ignore function** (return `false` to include)

## Step 1: Add to Vite Externals

Edit `vite.main.config.mts` and add the module to the `external` array:

```typescript
// vite.main.config.mts
rollupOptions: {
  external: [
    // Existing externals...
    "electron",
    "better-sqlite3",
    "onnxruntime-node",
    "@xenova/transformers",
    "keytar",
    "bufferutil",
    "utf-8-validate",
    "electron-squirrel-startup",
    
    // Add your module here:
    "your-native-module",
    
    // For modules with platform packages, add regex:
    // Sharp: external so native addons load from node_modules
    /^@img\/sharp/,
    
    // sqlite-vec: external so native extension loads from node_modules
    "sqlite-vec",
    /^sqlite-vec-/,  // Matches sqlite-vec-darwin-arm64, sqlite-vec-windows-x64, etc.
    
    // Pattern: /^module-name-/ for platform-specific packages
  ],
}
```

### Pattern Reference

| Module | String External | Regex for Platform Packages |
|--------|----------------|----------------------------|
| sharp | `"sharp"` | `/^@img\/sharp/` |
| sqlite-vec | `"sqlite-vec"` | `/^sqlite-vec-/` |
| better-sqlite3 | `"better-sqlite3"` | N/A (single package) |
| keytar | `"keytar"` | N/A (single package) |
| onnxruntime-node | `"onnxruntime-node"` | N/A |

## Step 2: Add to Forge asarUnpack

Edit `forge.config.ts` packagerConfig to unpack native modules from ASAR:

```typescript
// forge.config.ts
packagerConfig: {
  asar: true,
  asarUnpack: [
    // Existing entries...
    "**/node_modules/better-sqlite3/**",
    "**/node_modules/bindings/**",
    "**/node_modules/@electron/**",
    
    // Add your module:
    "**/node_modules/your-native-module/**",
    "**/node_modules/your-native-module-*/**",  // Platform packages
  ],
}
```

## Step 3: Add to Forge ignore Function

Edit the `ignore()` function in `forge.config.ts` to include the module in packaging:

```typescript
// forge.config.ts
const ignore = (file: string) => {
  // Existing rules...
  
  // Add your module (return false to INCLUDE):
  if (file.startsWith("/node_modules/your-native-module")) {
    return false;
  }
  
  return true;
};
```

## Common Native Modules in Applaa

Already configured (reference):
- `better-sqlite3` - SQLite database
- `sharp` - Image processing
- `sqlite-vec` - Vector search extension
- `keytar` - Credential storage
- `onnxruntime-node` - ML inference
- `bufferutil`, `utf-8-validate` - WebSocket support

## Debugging

If module still fails after adding externals:

1. **Check the error path** - Should reference `node_modules`, not `.vite/build/`
2. **Check package.json** - Ensure native module is in `dependencies` (not devDependencies)
3. **Run rebuild** - `npm run rebuild` to rebuild native modules for Electron
4. **Check platform packages** - Some modules need platform-specific packages installed

## Example: Adding a New Native Module

Adding hypothetical `node-canvas`:

```typescript
// 1. vite.main.config.mts
external: [
  // ...existing
  "canvas",
  /^@napi-rs\/canvas/,  // Platform packages if any
]

// 2. forge.config.ts - asarUnpack
asarUnpack: [
  // ...existing
  "**/node_modules/canvas/**",
]

// 3. forge.config.ts - ignore function
if (file.startsWith("/node_modules/canvas")) {
  return false;
}
```
