# 🍊 **START HERE - Applaa Merge System**

## 🎯 **What You Need to Know**

This folder contains **5 clean scripts** that handle merging upstream Dyad updates while preserving all your Applaa customizations.

---

## ⚡ **MOST USERS: Use This One Command**

```powershell
# This does everything automatically:
.\merge-dyad-to-applaa.ps1
```

**That's it!** This master script:
- ✅ Downloads latest Dyad automatically
- ✅ Creates backup of your current Applaa
- ✅ Merges upstream changes intelligently  
- ✅ Preserves ALL Applaa customizations
- ✅ Applies branding throughout codebase
- ✅ Validates everything works correctly

---

## 🔍 **SAFETY FIRST: Always Dry Run**

```powershell
# Preview what would happen (no changes made):
.\merge-dyad-to-applaa.ps1 -DryRun
```

---

## 🔧 **ADVANCED USERS: Individual Scripts**

If you need granular control:

1. **`1-backup-current.ps1`** - Create backup only
2. **`2-merge-upstream.ps1`** - Merge Dyad changes only  
3. **`3-apply-branding.ps1`** - Apply Applaa branding only
4. **`4-validate-merge.ps1`** - Validate and fix issues only

---

## 📚 **Need Help?**

- **Quick Guide**: `USAGE-GUIDE.md`
- **Full Docs**: `docs/APPLAA_MERGE_MASTER.md`
- **Main README**: `README.md`

---

## 🚨 **What NOT to Use**

❌ Don't manually copy files  
❌ Don't edit the backup folders  
❌ Don't modify the numbered scripts unless you're an expert  

---

## ✅ **Success Indicators**

After running the merge script:
- ✅ No PowerShell errors during execution
- ✅ `npm start` works without issues
- ✅ Mobile preview functionality works
- ✅ UI shows orange/green Applaa theme
- ✅ Generated apps have no "Unmatched Route" errors

---

**🍊 That's it! Keep it simple and use the master script! 🍊**







