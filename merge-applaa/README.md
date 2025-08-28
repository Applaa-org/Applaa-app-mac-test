# 🍊 Applaa Merge Management System

This folder contains everything needed to merge upstream Dyad updates while preserving all Applaa customizations.

## 📁 Contents

### 🎯 **Core Scripts (Use These)**
- **`merge-dyad-to-applaa.ps1`** - 🚀 **MASTER SCRIPT** - One command does everything
- **`1-backup-current.ps1`** - Creates complete backup before merge
- **`2-merge-upstream.ps1`** - Intelligently merges upstream Dyad changes
- **`3-apply-branding.ps1`** - Applies all Applaa branding and customizations
- **`4-validate-merge.ps1`** - Validates merge success with auto-fix

### 📚 **Documentation**
- **`USAGE-GUIDE.md`** - Simple usage instructions for all scenarios
- **`docs/APPLAA_MERGE_MASTER.md`** - Complete technical documentation

### 💾 **Backups**
- **`src/`** - Backup of all customized source files
- **`assets/`** - Backup of all Applaa assets  
- **`expo-templates/`** - Backup of mobile app templates
- **`prompts/`** - Backup of enhanced system prompts

## 🚀 **Simple Usage** 

### ⚡ **One Command Does Everything**
```powershell
# Downloads latest Dyad and merges automatically
.\merge-dyad-to-applaa.ps1

# Dry run first (recommended)
.\merge-dyad-to-applaa.ps1 -DryRun

# With your own Dyad path
.\merge-dyad-to-applaa.ps1 -DyadPath "C:\path\to\dyad"
```

### 🔧 **Advanced Usage**
```powershell
# Individual steps (for advanced users)
.\1-backup-current.ps1
.\2-merge-upstream.ps1 -UpstreamPath "C:\path\to\dyad"
.\3-apply-branding.ps1
.\4-validate-merge.ps1 -FixIssues
```

## 🛡️ What's Protected

### Never Overwritten
- `assets/applaa-logo.svg`
- `assets/icon/logo.png`
- `assets/icon/logo.ico`
- `expo-templates/expo-base-master/`
- `src/components/expo/`
- `src/components/SparkModeSelector.tsx`
- `src/components/PlatformSelector.tsx`
- `src/components/AppTypeSelector.tsx`
- `src/lib/appTypeDetector.ts`
- `src/ipc/handlers/expo_handlers.ts`

### Carefully Merged
- `package.json` (preserves Applaa metadata)
- `src/styles/globals.css` (preserves color themes)
- All UI components with Applaa branding
- Settings and schemas with Spark features

## 🔧 Manual Steps After Merge

1. **Test the application**: `npm start`
2. **Verify Applaa features**:
   - Logo and branding appear correctly
   - Spark features work (Spark Edits, Spark Context)
   - Mobile preview functionality
   - Orange/green color themes
3. **Check for any new upstream files** that might need Applaa branding
4. **Update version numbers** if needed

## 📋 Troubleshooting

### If merge fails:
1. Check the backup folder created during merge
2. Run `.\validate-merge.ps1` to see what's missing
3. Manually copy missing files from `merge-applaa/src/`
4. Run `.\apply-branding.ps1` to fix any branding issues

### If new upstream files need branding:
1. Add them to `apply-branding.ps1`
2. Update the file lists in `merge-upstream.ps1`
3. Update `APPLAA_MERGE_MASTER.md` documentation

## 🔄 **Recommended Workflow**

```powershell
# When new Dyad version is available:

# 1. Dry run first (safe preview)
.\merge-dyad-to-applaa.ps1 -DryRun

# 2. If dry run looks good, do the real merge
.\merge-dyad-to-applaa.ps1 -AutoFix

# 3. Test your upgraded Applaa
npm start

# That's it! 🎉
```

## 📚 Documentation

See `docs/APPLAA_MERGE_MASTER.md` for comprehensive details on every customization made to create Applaa from Dyad.

---

**Last Updated**: January 17, 2025  
**Version**: 1.1.0

## 🔥 Latest Updates (v1.1.0)

### ✅ Fixed at System Prompt Level:
- **TypeScript Errors**: Prevented 22+ common build errors (Lucide icon props, implicit-any types)
- **Routing Errors**: Eliminated "Unmatched Route" crashes with mandatory file structure validation
- **Design Quality**: Enhanced UI guidelines for stunning, professional mobile apps

### 🎨 User Experience Improvements:
- **Auto-Preview Refresh**: Preview automatically updates after every LLM response
- **Fixed Mobile Preview**: Proper sizing, zoom controls, improved device frames
- **Clean Chat Interface**: Hidden promotional banners for focused experience
