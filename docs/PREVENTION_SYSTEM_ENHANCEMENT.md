# Prevention System Enhancement - Stop Issues at Source

## 🎯 **Goal Achieved**

We've enhanced the **Expo System Prompt** to **prevent corrupted assets and dependency issues** at the source, rather than just fixing them after they occur.

## 🚀 **Major Enhancements Added**

### 1. **🖼️ Comprehensive Asset Handling Rules**

#### **New Critical Rules Added:**
```
❌ FORBIDDEN - Will Break Metro Bundler:
- Empty image files (0 bytes) → "unsupported file type: undefined"
- Corrupted image files (invalid headers) → "unsupported file type: undefined"
- Non-existent image references → Import errors
- Invalid file formats → Metro bundling failures
```

#### **✅ Correct Asset Strategies:**
1. **Default**: Use Expo's vector icons (always available)
2. **For Custom Images**: Use placeholder URLs (Lorem Picsum)
3. **For Local Assets**: Only use require() with existing assets

#### **Asset File Creation Protocol:**
- **NEVER create actual image files** unless explicitly requested
- **NEVER create empty or corrupted image files**
- **ALWAYS use vector icons or placeholder URLs by default**

### 2. **📦 Strict Dependency Installation Workflow**

#### **New Mandatory Workflow:**
```
1. FIRST: Add dependency to package.json
   <applaa-add-dependency packages="package-name">

2. THEN: Import and use in code
   import PackageName from 'package-name';

3. NEVER: Use a package without adding it first
```

#### **Enhanced Rules:**
- ❌ **WRONG**: Import a package without `<applaa-add-dependency>`
- ❌ **WRONG**: Create code that imports non-installed packages
- ✅ **CORRECT**: Always add dependency first, then use it

### 3. **🚨 Enhanced Common Mistakes Section**

#### **Added New Critical Mistakes:**
- ❌ **MISTAKE #6**: Creating corrupted/empty asset files → Causes Metro bundling errors
- ❌ **MISTAKE #7**: Using packages without adding dependencies first → Import errors

### 4. **🔄 Mandatory Workflow - Follow Exactly**

#### **Step 1: Dependency Check (BEFORE any code)**
```
1. Does the app need any packages not in the pre-installed list?
2. If YES: Add <applaa-add-dependency packages="package-name">
3. If NO: Proceed with pre-installed packages only
```

#### **Step 2: Asset Strategy (BEFORE any code)**
```
1. Does the app need images/assets?
2. If YES: Use vector icons or placeholder URLs (NOT actual files)
3. If NO: Use only vector icons for any visual elements
```

#### **Step 3: Code Generation**
```
1. FIRST: <applaa-write path="app/index.tsx"> (replace template)
2. THEN: Create supporting files
3. NEVER: Create empty or corrupted asset files
```

### 5. **📝 Enhanced Final Checklist**

#### **New Critical Priorities:**
- [ ] **#2 PRIORITY: Added all dependencies BEFORE using them?** ⚠️ CRITICAL
- [ ] **#3 PRIORITY: No corrupted/empty asset files created?** ⚠️ CRITICAL
- [ ] All asset references use valid sources (vector icons, URLs, existing files)?

### 6. **📋 Enhanced Response Format**

#### **New Mandatory Steps:**
1. **First**: Acknowledge what you're building
2. **Second**: **DEPENDENCY CHECK** - List any packages to add
3. **Third**: **ASSET STRATEGY** - Confirm using vector icons or placeholder URLs
4. **Fourth**: **START WITH app/index.tsx** to replace template

#### **New "Never" Rules:**
- **Never**: Create corrupted or empty asset files
- **Never**: Use packages without adding dependencies first

## 🎯 **Impact on LLM Behavior**

### **Before Enhancement:**
- LLMs could create corrupted asset files
- LLMs could use packages without adding dependencies
- Issues were fixed after they occurred
- Reactive approach to problems

### **After Enhancement:**
- LLMs **must** follow dependency installation workflow
- LLMs **cannot** create corrupted asset files
- LLMs **must** use vector icons or placeholder URLs by default
- **Proactive prevention** of issues

## 📊 **Expected Results**

### **For New Apps:**
- ✅ **No corrupted asset files** created
- ✅ **All dependencies properly added** before use
- ✅ **Metro bundler works** without errors
- ✅ **Preview loads successfully** every time

### **For Existing Apps:**
- ✅ **Problems Tab can detect and fix** issues automatically
- ✅ **Enhanced system catches** problems during development
- ✅ **Auto-fix capabilities** for corrupted assets

## 🔄 **Complete Prevention Strategy**

1. **Prevention**: Enhanced system prompts prevent issues at source
2. **Detection**: Enhanced Problems Tab catches any issues that slip through
3. **Fixing**: Auto-fix capabilities repair issues automatically
4. **Recovery**: Enhanced Rebuild functionality handles edge cases

## 🎉 **Mission Accomplished**

We now have a **comprehensive prevention and recovery system**:

- **🚫 Prevents**: Corrupted assets and dependency issues at source
- **🔍 Detects**: Issues that slip through with enhanced Problems Tab
- **🔧 Fixes**: Issues automatically with auto-fix capabilities
- **🔄 Recovers**: From edge cases with enhanced Rebuild functionality

**Result**: **Zero-tolerance system** for the issues that were causing Metro bundling errors and broken previews!
