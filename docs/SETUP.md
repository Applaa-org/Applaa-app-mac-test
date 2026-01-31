# Developer Setup Guide

## Quick Start

```bash
git checkout ApplaaRahul-BlockyMicrobit
npm install
npm start
```

## New Dependencies
- `adm-zip` - Minecraft JAR extraction

## Common Issues

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors in IDE
Run: `npx tsc --noEmit`  
If it passes, restart your IDE.

### Missing adm-zip
```bash
npm install adm-zip
```

## Verification
- [ ] `npm install` works
- [ ] `npx tsc --noEmit` passes
- [ ] `npm start` launches app

## New Features
- Minecraft mod build system (requires Java JDK 17+ & Gradle)
- Appy 3D character in Blockly
- Expo Snack plans (not yet implemented)

## Help
See full guide: `DEVELOPER_SETUP.md`
