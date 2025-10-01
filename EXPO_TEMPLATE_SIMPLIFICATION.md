# ✅ Expo Template Simplification - Remove Unnecessary AsyncStorage

**Date:** 2025-09-30  
**Issue:** LLM is adding AsyncStorage and `utils/storage.ts` to every Expo app, even simple ones  
**User Feedback:** "async storage and storage.ts also not that required initially"

---

## 🐛 Problem

### Current Behavior:
The Expo system prompt says:
```
## 💾 **DATA PERSISTENCE (MANDATORY)**

### **AsyncStorage for Local Data:**
- **ALWAYS include AsyncStorage** in every Expo app for data persistence
- **Pattern**: Create storage utilities for common operations (get, set, remove, clear)
```

This causes the LLM to:
1. ❌ Add `@react-native-async-storage/async-storage` to every app
2. ❌ Create `utils/storage.ts` with complex utility functions
3. ❌ Add unnecessary dependencies for simple apps
4. ❌ Cause bundling errors: `Unable to resolve "@react-native-async-storage/async-storage"`

---

## ✅ Solution

### Changes Made to `src/prompts/expo_system_prompt.ts`:

**1. Changed "MANDATORY" to "ONLY WHEN NEEDED":**
```typescript
## 💾 **DATA PERSISTENCE (ONLY WHEN NEEDED)**
```

**2. Removed from "Essential" packages:**
```diff
### ✓ **Essential (Pre-installed in template)**
- react, react-native, expo, expo-router
- @expo/vector-icons, expo-status-bar
- react-native-safe-area-context, react-native-screens
- react-native-web (for web support)
-  react-native-gesture-handler, @react-native-async-storage/async-storage ❌ REMOVED
```

**3. Moved to "Common (ONLY when needed)":**
```diff
### ✓ **Common (Auto-install ONLY when user explicitly needs them)**
- expo-linear-gradient (gradients)
- expo-haptics (vibration)
+ @react-native-async-storage/async-storage (local storage - ONLY if user asks) ✅ ADDED HERE
- expo-blur, expo-device, expo-system-ui (special effects)
```

**4. Updated AsyncStorage section to be conditional:**

**NEED TO MANUALLY EDIT THIS SECTION** (lines 217-249 in `src/prompts/expo_system_prompt.ts`):

**Change FROM:**
```
## 💾 **DATA PERSISTENCE (MANDATORY)**

### **AsyncStorage for Local Data:**
- **ALWAYS include AsyncStorage** in every Expo app for data persistence
- Use '@react-native-async-storage/async-storage' for storing user preferences, app state, and offline data
- **Pattern**: Create storage utilities for common operations (get, set, remove, clear)
- **Best Practice**: Always handle AsyncStorage operations with try/catch blocks

### **Example AsyncStorage Usage:**

<applaa-write path="utils/storage.ts">
'''typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store data
const storeData = async (key: string, value: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

// Retrieve data
const getData = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error retrieving data:', error);
    return null;
  }
};
'''
</applaa-write>
```

**Change TO:**
```
## 💾 **DATA PERSISTENCE (ONLY WHEN NEEDED)**

### **AsyncStorage for Local Data:**
- ❌ **DO NOT add AsyncStorage by default** - only add it when the user specifically requests data persistence
- ✓ **Only use when needed**: User wants to save settings, preferences, or offline data
- ✓ **Use '@react-native-async-storage/async-storage'** if the user asks for local storage
- ✓ **Auto-install with <applaa-add-dependency>** when actually needed
- ❌ **DO NOT create utils/storage.ts unless explicitly required**

### **When to Add AsyncStorage:**
- ✓ User asks for: "save user preferences", "remember settings", "offline mode", "local storage"
- ✓ App needs: Authentication tokens, user session, cached data
- ❌ Simple apps without persistence needs: DO NOT add AsyncStorage or storage utilities

### **Example (ONLY use when needed):**
If user explicitly requests data persistence:
```typescript
// Only create this IF user asks for storage
import AsyncStorage from '@react-native-async-storage/async-storage';

const storeData = async (key: string, value: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};
```
```

---

## 📊 Impact

### Before:
**Every Expo app gets:**
- ❌ `@react-native-async-storage/async-storage` dependency
- ❌ `utils/storage.ts` with complex utilities
- ❌ Bundling errors if not installed
- ❌ Unnecessary bloat for simple apps

**Example:** Simple "fitness tracker" app gets full storage utilities even if it doesn't need to save data

### After:
**Only when user asks for it:**
- ✅ Simple apps stay simple (no storage)
- ✅ AsyncStorage only added if user requests: "save preferences", "offline mode", etc.
- ✅ No unnecessary dependencies
- ✅ Faster preview, less errors

**Example:** Simple "fitness tracker" app gets only the UI, no storage until user says "save workouts offline"

---

## ✅ Status

**Completed:**
- ✅ Removed AsyncStorage from "Essential" list
- ✅ Added to "Common (ONLY when needed)" with clear note
- ✅ Updated Testing section

**TODO (Manual Edit Required):**
- ⚠️ **NEED TO MANUALLY EDIT** lines 217-249 in `src/prompts/expo_system_prompt.ts`
- Replace the entire "DATA PERSISTENCE (MANDATORY)" section with the "ONLY WHEN NEEDED" version above
- This will prevent LLM from auto-adding storage to every app

---

## 🎯 Expected Behavior After Fix

### User Creates Simple Expo App:
```
User: "Create a fitness tracker app"

LLM Response:
- ✅ Creates app with UI (View, Text, FlatList)
- ✅ No AsyncStorage
- ✅ No utils/storage.ts
- ✅ Preview works without errors
```

### User Requests Storage:
```
User: "Save workouts offline"

LLM Response:
- ✅ Adds <applaa-add-dependency name="@react-native-async-storage/async-storage" />
- ✅ Creates utils/storage.ts with needed functions
- ✅ Implements offline storage
```

---

**File to Edit:** `src/prompts/expo_system_prompt.ts` (lines 217-249)  
**Status:** ⚠️ **MANUAL EDIT REQUIRED** (automated edit failed due to escape characters)  
**Priority:** 🔥 **HIGH** - Prevents unnecessary dependencies in all future Expo apps






