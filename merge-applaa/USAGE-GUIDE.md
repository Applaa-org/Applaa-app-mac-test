# 🍊 Applaa Merge System - Usage Guide

## 🎯 **One-Command Merge (Recommended)**

The easiest way to merge the latest Dyad updates:

```powershell
# Download latest Dyad and merge automatically
.\merge-applaa\merge-dyad-to-applaa.ps1

# Or specify your own Dyad path
.\merge-applaa\merge-dyad-to-applaa.ps1 -DyadPath "C:\path\to\dyad"

# Dry run first (recommended)
.\merge-applaa\merge-dyad-to-applaa.ps1 -DryRun
```

**That's it!** The master script handles everything automatically.

---

## 🔧 **Advanced Usage**

### **Master Script Options**

```powershell
# Full dry run with verbose output
.\merge-applaa\merge-dyad-to-applaa.ps1 -DryRun -Verbose

# Real merge with auto-fix and detailed output
.\merge-applaa\merge-dyad-to-applaa.ps1 -AutoFix -Verbose

# Skip backup (not recommended)
.\merge-applaa\merge-dyad-to-applaa.ps1 -SkipBackup

# Custom backup location
.\merge-applaa\merge-dyad-to-applaa.ps1 -BackupPath "my-backup-folder"
```

### **Individual Scripts (For Advanced Users)**

```powershell
# 1. Create backup only
.\merge-applaa\1-backup-current.ps1

# 2. Merge upstream only (requires existing backup)
.\merge-applaa\2-merge-upstream.ps1 -UpstreamPath "C:\path\to\dyad"

# 3. Apply branding only
.\merge-applaa\3-apply-branding.ps1

# 4. Validate merge only
.\merge-applaa\4-validate-merge.ps1 -FixIssues
```

---

## 📋 **Common Scenarios**

### **1. Regular Update (Monthly/Quarterly)**
```powershell
# Safe approach - dry run first
.\merge-applaa\merge-dyad-to-applaa.ps1 -DryRun

# If dry run looks good, run real merge
.\merge-applaa\merge-dyad-to-applaa.ps1
```

### **2. Major Dyad Release**
```powershell
# Extra cautious approach
.\merge-applaa\merge-dyad-to-applaa.ps1 -DryRun -Verbose

# Review the detailed analysis, then:
.\merge-applaa\merge-dyad-to-applaa.ps1 -AutoFix -Verbose
```

### **3. Quick Update (Experienced Users)**
```powershell
# One command with auto-fix
.\merge-applaa\merge-dyad-to-applaa.ps1 -AutoFix
```

### **4. Fixing Issues After Merge**
```powershell
# Run validation with auto-fix
.\merge-applaa\4-validate-merge.ps1 -FixIssues

# If critical issues, restore from backup
# (Instructions will be in the backup folder)
```

---

## 🛡️ **What's Protected**

✅ **Never Overwritten:**
- Applaa branding and logos
- Mobile preview components
- System prompts with routing/TypeScript fixes
- Expo templates
- Orange/green color theme

✅ **Intelligently Merged:**
- package.json (preserves Applaa metadata)
- Dependencies and configs
- Core source files

✅ **Automatically Applied:**
- All "Dyad" → "Applaa" text replacements
- Applaa branding throughout codebase
- Custom component functionality

---

## 🚨 **Troubleshooting**

### **Issue: Script won't run**
```powershell
# Enable script execution
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue: Git not found**
- Install Git for Windows
- Or manually download Dyad zip and use `-DyadPath`

### **Issue: Merge validation fails**
```powershell
# Try auto-fix
.\merge-applaa\4-validate-merge.ps1 -FixIssues

# Manual restore if needed
# (Follow instructions in backup folder)
```

### **Issue: NPM errors after merge**
```powershell
# Clean install
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

---

## 📈 **Expected Results**

After a successful merge, you should have:

- ✅ **Latest Dyad features** (bug fixes, new functionality, performance improvements)
- ✅ **All Applaa customizations** (branding, mobile preview, enhanced prompts)
- ✅ **No build errors** (TypeScript issues prevented by system prompts)
- ✅ **No routing errors** (Unmatched Route prevention built-in)
- ✅ **Auto-refresh preview** (no manual refresh needed after LLM responses)
- ✅ **Professional branding** (orange/green theme, Applaa logos)

---

## 🎯 **Success Metrics**

✅ **npm start** runs without errors  
✅ **Mobile preview** works correctly  
✅ **App creation** generates stunning, modern UIs  
✅ **No "Unmatched Route"** errors in generated apps  
✅ **Auto-refresh** works after LLM responses  
✅ **Applaa branding** visible throughout interface  

---

## 🔗 **Quick Links**

- **Full Documentation**: `docs/APPLAA_MERGE_MASTER.md`
- **Main README**: `README.md`
- **Restore Instructions**: Created in each backup folder

---

**🍊 Happy merging! Your Applaa customizations are in safe hands! 🍊**
