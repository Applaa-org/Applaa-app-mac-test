# Expo Auto-Fix Feature for Dependency Errors

## Overview

Implemented automatic dependency error detection and fixing for Expo mobile apps to improve non-technical user experience.

## Problem

When users click "Preview" for Expo apps, dependency errors appear in the terminal:
```
Unable to resolve "@expo-google-fonts/inter" from "app/_layout.tsx"
Module not found: Can't resolve 'react-native-vector-icons'
```

**Previous UX:** Users had to:
1. Read error from terminal
2. Copy error message
3. Paste into chat
4. Wait for AI to fix
5. Preview again

**This is too technical for non-technical users!**

---

## Solution

### ✅ Automatic Dependency Error Detection & Fixing

When user clicks "Preview" on Expo app:
1. **Terminal output is monitored** for dependency errors
2. **Errors are auto-detected** using pattern matching
3. **Errors are posted to chat** automatically
4. **AI fixes the errors** without user intervention
5. **User just waits** for preview to work

---

## Implementation

### Files Modified (Only 2 files!)

#### 1. `src/hooks/useAutoErrorFix.ts`

**Changes:**
- Added `'dependency'` to error categories
- Added `detectExpoDependencyErrors()` function
- Detects patterns: `Unable to resolve`, `Module not found`, `Cannot find module`
- Returns function for Expo components to use

**Code Added (~40 lines):**
```typescript
const detectExpoDependencyErrors = useCallback((terminalOutput: string) => {
  if (!enabled || !terminalOutput) return;
  
  const dependencyPatterns = [
    /Unable to resolve\s+"([^"]+)"/gi,
    /Module not found:\s+Can't resolve\s+'([^']+)'/gi,
    /Cannot find module\s+'([^']+)'/gi,
    /Error:\s+Cannot find module\s+'([^']+)'/gi,
  ];
  
  // ... detect errors and add to detectedErrors
}, [enabled]);
```

#### 2. `src/components/expo/UnifiedExpoPreview.tsx`

**Changes:**
- Imported `useAutoErrorFix` hook
- Added terminal output monitoring
- Auto-detects dependency errors
- Auto-fixes detected errors

**Code Added (~15 lines):**
```typescript
// Import auto-fix hook
import { useAutoErrorFix } from '@/hooks/useAutoErrorFix';

// Use the hook
const { detectExpoDependencyErrors, detectedErrors, fixAllErrors } = useAutoErrorFix({ 
  enabled: true 
});

// Monitor terminal output
useEffect(() => {
  if (terminalOutput) {
    detectExpoDependencyErrors(terminalOutput);
  }
}, [terminalOutput, detectExpoDependencyErrors]);

// Auto-fix detected errors
useEffect(() => {
  if (detectedErrors.length > 0) {
    console.log(`🔧 Auto-fixing ${detectedErrors.length} Expo dependency errors...`);
    fixAllErrors();
  }
}, [detectedErrors.length]);
```

---

## How It Works

### User Flow (Simplified!)

**Before:**
```
User clicks Preview 
  → Error in terminal
  → User confused 😕
  → User copies error
  → User pastes in chat
  → AI fixes
  → User clicks Preview again
  → Works ✅
```

**After:**
```
User clicks Preview
  → Error auto-detected 🔍
  → Error auto-posted to chat 💬
  → AI auto-fixes 🤖
  → User waits ~10 seconds ⏱️
  → Works ✅
```

---

## Technical Details

### Error Detection Patterns

Detects common Expo dependency errors:

| Pattern | Example |
|---------|---------|
| `Unable to resolve` | `Unable to resolve "@expo-google-fonts/inter"` |
| `Module not found` | `Module not found: Can't resolve 'react-native-reanimated'` |
| `Cannot find module` | `Cannot find module 'expo-status-bar'` |

### De-duplication

- Uses `processedErrorsRef` to track detected errors
- Same error won't be posted multiple times
- Error ID format: `expo-dep-${packageName}`

### Integration Points

- **Terminal Output:** Captured by `simpleExpoStatus()` IPC call
- **Error Detection:** On every terminal output update
- **Auto-Fix:** Uses existing `fixAllErrors()` from `useAutoErrorFix`
- **Chat Post:** Leverages existing auto-fix chat posting mechanism

---

## User Experience

### Non-Technical User Scenario

**User:** "I want to preview my fitness app"

**Steps:**
1. User clicks "Preview" button
2. Terminal shows: `Unable to resolve "@expo-google-fonts/inter"`
3. **Behind the scenes:**
   - Error detected automatically
   - Posted to chat: "Missing Expo dependency: @expo-google-fonts/inter"
   - AI responds: "I'll install that for you with `npx expo install @expo-google-fonts/inter`"
   - AI runs command and updates code
4. User sees in chat: "✅ Installed @expo-google-fonts/inter"
5. Preview starts working

**User experience:** Just wait, no technical knowledge needed! ✨

---

## Configuration

### Enable/Disable

Auto-fix is controlled by `useAutoErrorFix({ enabled: true })`:

```typescript
// Enable auto-fix (default for Expo preview)
const { detectExpoDependencyErrors } = useAutoErrorFix({ enabled: true });

// Disable auto-fix (if needed for debugging)
const { detectExpoDependencyErrors } = useAutoErrorFix({ enabled: false });
```

### Customization

To add more error patterns, edit `src/hooks/useAutoErrorFix.ts`:

```typescript
const dependencyPatterns = [
  /Unable to resolve\s+"([^"]+)"/gi,
  /Module not found:\s+Can't resolve\s+'([^']+)'/gi,
  /Cannot find module\s+'([^']+)'/gi,
  // Add custom pattern here:
  /Your custom pattern/gi,
];
```

---

## Testing

### Manual Testing

1. Create new Expo app with font dependencies
2. AI generates code using `@expo-google-fonts/inter` (common)
3. Click "Preview" button
4. Watch terminal output
5. Verify error is auto-detected
6. Verify error is posted to chat
7. Verify AI fixes the error
8. Verify preview works after fix

### Console Logs

Look for these logs to verify it's working:

```
🔍 Detected Expo dependency error: @expo-google-fonts/inter
🔧 Auto-fixing 1 Expo dependency errors...
✅ Posted error to chat for AI to fix
```

---

## Benefits

### For Non-Technical Users

✅ **No copy-paste required** - Errors auto-detected
✅ **No technical knowledge** - Don't need to understand errors
✅ **Faster workflow** - One click, wait for fix
✅ **Less confusion** - App just works after waiting

### For Technical Users

✅ **Still transparent** - Can see what's happening in chat
✅ **Can disable** - Set `enabled: false` if desired
✅ **Maintains control** - Can intervene if needed

---

## Future Enhancements

Possible improvements (not implemented yet):

1. **Progress indicator** - Show "Auto-fixing dependencies..." message
2. **Pattern learning** - Learn new error patterns over time
3. **Batch fixing** - Collect all errors before fixing
4. **Preview auto-restart** - Auto-click Preview after fix
5. **Success notification** - Toast when fix completes

---

## Architecture

### Call Flow

```
UnifiedExpoPreview
  ↓
  terminalOutput updated (from IPC polling)
  ↓
  useEffect monitors terminalOutput
  ↓
  detectExpoDependencyErrors(terminalOutput)
  ↓
  Pattern matching finds errors
  ↓
  Errors added to detectedErrors state
  ↓
  useEffect monitors detectedErrors.length
  ↓
  fixAllErrors() called
  ↓
  Existing auto-fix system posts to chat
  ↓
  AI receives error message
  ↓
  AI fixes dependency issue
  ↓
  Preview works ✅
```

### Integration with Existing Systems

**Reuses:**
- ✅ `useAutoErrorFix` hook (existing)
- ✅ `fixAllErrors()` function (existing)
- ✅ Chat posting mechanism (existing)
- ✅ AI fix prompt generation (existing)
- ✅ Terminal output polling (existing)

**No new files created!** Just extended existing functionality.

---

## Summary

### What We Built

- ✅ Automatic dependency error detection for Expo
- ✅ Auto-posting errors to chat for AI to fix
- ✅ Seamless UX for non-technical users
- ✅ Leveraged existing auto-fix infrastructure
- ✅ Only 2 files modified (~55 lines total)

### Why It's Good

- ✅ **Simple** - Minimal code, maximum impact
- ✅ **Non-intrusive** - Uses existing systems
- ✅ **User-friendly** - No technical knowledge required
- ✅ **Maintainable** - Easy to understand and extend
- ✅ **Follows Dyad patterns** - Doesn't over-engineer

---

**Status:** ✅ **IMPLEMENTED**
**Date:** 2025-09-30
**Files Modified:** 2
**Lines Added:** ~55
**User Impact:** 🚀 **MAJOR** - Much better UX for non-technical users!
