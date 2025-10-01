# 🚀 Development Workflow - Safe Branching Strategy

## ⚠️ **CRITICAL RULE: NEVER COMMIT DIRECTLY TO MASTER**

To prevent broken code from reaching production, we follow this strict branching workflow:

## 📋 **Branch Strategy**

### **1. Always Create Feature Branches**
```bash
# Create a new feature branch for any changes
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/database-fixes
git checkout -b feature/template-improvements
git checkout -b feature/prompt-optimization
```

### **2. Development Workflow**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make your changes
# ... edit files ...

# 3. Test thoroughly
npm run test:core
npm run build:check

# 4. Commit to feature branch
git add .
git commit -m "✨ Add new feature with comprehensive testing"

# 5. Push feature branch
git push origin feature/new-feature

# 6. Create Pull Request for review
# 7. Only merge to master after approval and testing
```

## 🛡️ **Safety Checks Before Any Commit**

### **Pre-Commit Checklist:**
- [ ] All TypeScript errors resolved
- [ ] Linting passes without critical errors
- [ ] Core tests pass (`npm run test:core`)
- [ ] Build check passes (`npm run build:check`)
- [ ] Feature tested in development environment
- [ ] No console errors in browser
- [ ] Database migrations work correctly

### **Pre-Merge to Master Checklist:**
- [ ] Feature branch fully tested
- [ ] Pull Request reviewed
- [ ] All safety checks pass
- [ ] No breaking changes
- [ ] Documentation updated if needed

## 🔄 **Branch Naming Convention**

### **Feature Branches:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `improvement/description` - Enhancements
- `refactor/description` - Code refactoring

### **Examples:**
```bash
feature/database-migration-safety
fix/import-error-prevention
improvement/template-structure
refactor/prompt-optimization
```

## 🚨 **Emergency Hotfixes**

For critical production issues only:
```bash
# 1. Create hotfix branch from master
git checkout master
git pull origin master
git checkout -b hotfix/critical-issue

# 2. Make minimal fix
# 3. Test immediately
# 4. Commit and push
git add .
git commit -m "🚨 HOTFIX: Critical issue resolution"
git push origin hotfix/critical-issue

# 5. Merge to master immediately (emergency only)
# 6. Create follow-up feature branch for proper solution
```

## 📝 **Commit Message Format**

### **Format:**
```
🎯 Type: Brief description

- Detailed explanation of changes
- What was fixed/improved
- Impact on users/platform

Resolves: Issue description
```

### **Examples:**
```
✨ Feature: Add comprehensive data directory to NextJS template

- Add profiles.ts, users.ts, products.ts with TypeScript interfaces
- Include helper functions for data management
- Prevent import errors in generated apps
- Enhance user experience with ready-to-use mock data

Resolves: Failed to resolve import @/data/profiles errors
```

```
🔧 Fix: Resolve system prompt syntax errors

- Remove problematic markdown code blocks
- Replace backticks with single quotes
- Fix import safety rules formatting
- Ensure proper TypeScript syntax

Resolves: System prompt compilation errors
```

## 🎯 **Current Active Branch**

**Current Branch:** `feature/system-prompt-improvements`
**Purpose:** Safe development of system prompt enhancements
**Status:** Ready for development

---

## ⚡ **Quick Commands Reference**

```bash
# Create new feature branch
git checkout -b feature/your-feature-name

# Check current branch
git branch

# Switch to master
git checkout master

# Switch to feature branch
git checkout feature/your-feature-name

# Push feature branch
git push origin feature/your-feature-name

# Check status
git status

# View recent commits
git log --oneline -5
```

---

**Remember: Master branch is sacred - protect it with feature branches! 🛡️**
