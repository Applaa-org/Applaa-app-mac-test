# Snack Preview Testing Guide
## How to Test Your New Expo Preview System

**Branch:** `feature/expo-preview-improvements`  
**Component:** `SnackPoweredPreview.tsx`  
**Status:** Ready to test! 🧪

---

## 🚀 Quick Start

### Step 1: Launch Applaa

```bash
npm start
```

Wait for Applaa to fully load.

---

### Step 2: Create or Open an Expo App

**Option A: Create New Expo App**
1. Click "New App" button
2. Enter app name (e.g., "TestSnackPreview")
3. Select "Expo" or "Mobile" app type
4. Wait for creation to complete

**Option B: Open Existing Expo App**
1. Click on an existing Expo app from the sidebar
2. Wait for app to load

---

### Step 3: Verify SnackPoweredPreview Loads

**What to Look For:**

✅ **Top Status Bar** should show:
- Green dot with "Connected" text (left side)
- Device selector buttons: Mobile | Tablet | Desktop
- QR Code button (blue)
- Refresh button

✅ **Preview Area** should show:
- Device frame (mobile by default)
- Expo web preview inside the frame
- Device label at bottom ("iPhone SE")

✅ **Console Output** should show:
```
🚀 Starting Snack-powered Expo preview for app: [appId]
📊 Expo start result: [...]
✅ Expo preview started successfully: http://localhost:8081
```

---

## 🧪 Test Scenarios

### Test 1: Basic Preview Loading ✅

**Steps:**
1. Open an Expo app
2. Wait for preview to load

**Expected Result:**
- ✅ Preview loads within 5-10 seconds
- ✅ Green "Connected" indicator
- ✅ App renders in device frame
- ✅ No error messages

**Success Criteria:**
- App preview is visible
- Status bar shows "Connected"
- Device frame displays correctly

---

### Test 2: Hot Reload (Most Important!) 🔥

**Steps:**
1. Open an Expo app with preview loaded
2. Open code editor (Code view)
3. Edit a file (e.g., `app/index.tsx`)
4. Make a visible change (e.g., change text: "Welcome" → "Hello World!")
5. Click outside the editor to trigger save (or Cmd/Ctrl+S)
6. Watch the preview

**Expected Result:**
- ✅ Preview updates automatically in < 500ms
- ✅ No manual refresh needed
- ✅ Changes are visible immediately
- ✅ Build status shows "Building..." then "Success"

**Console Output to Look For:**
```
📝 File change: app/index.tsx
🔥 Triggering hot reload for app [appId]: index.tsx
✅ Metro bundler notified for app [appId]
🔥 Hot reload detected! Refreshing preview...
```

**Success Criteria:**
- Changes appear in < 1 second
- No errors in console
- Preview remains connected

---

### Test 3: Device Frame Switching 📱

**Steps:**
1. Click "Mobile" button
2. Click "Tablet" button  
3. Click "Desktop" button
4. Click "Mobile" again

**Expected Result:**
- ✅ Device frame resizes smoothly
- ✅ Preview content scales appropriately
- ✅ Device label updates ("iPhone SE" → "iPad" → "Desktop")
- ✅ No layout breaks

**Success Criteria:**
- All 3 device types work
- Smooth transitions
- Content remains visible

---

### Test 4: QR Code Generation 📱

**Steps:**
1. Click "QR Code" button
2. Observe the modal
3. Open Expo Go app on your phone
4. Scan the QR code
5. Wait for app to load on device

**Expected Result:**
- ✅ QR code modal appears
- ✅ QR code is clearly visible
- ✅ URL is shown below QR code
- ✅ App loads on mobile device (if you have Expo Go)

**Success Criteria:**
- QR code generates successfully
- Modal can be closed
- URL is valid (starts with http:// or exp://)

---

### Test 5: Connection Status Indicator 🟢

**Steps:**
1. Watch the green dot during normal operation
2. Stop Expo server (if you can trigger this)
3. Watch status change to red "Disconnected"
4. Restart preview
5. Watch status return to green "Connected"

**Expected Result:**
- ✅ Green dot animates (pulses)
- ✅ Status text matches dot color
- ✅ Changes reflect actual connection state

**Success Criteria:**
- Visual indicator works
- Text updates correctly
- User can see connection status at a glance

---

### Test 6: Build Status Indicators ⚙️

**Steps:**
1. Make a file change to trigger rebuild
2. Watch the build status bar
3. Observe status progression

**Expected Result:**
- ✅ Shows "Building..." with spinner
- ✅ Changes to "Ready" with green checkmark
- ✅ If error, shows "Build Failed" with red icon

**Success Criteria:**
- Status updates in real-time
- Icons match status
- Messages are clear

---

### Test 7: Error Handling ❌

**Steps:**
1. Introduce a syntax error in code
2. Save the file
3. Observe the preview

**Expected Result:**
- ✅ Preview shows error message
- ✅ Build status shows "Build Failed"
- ✅ Error details are visible
- ✅ "Retry" button appears

**Steps to Fix:**
4. Fix the syntax error
5. Save the file
6. Watch recovery

**Expected Result:**
- ✅ Preview automatically recovers
- ✅ Build status returns to "Ready"
- ✅ App renders correctly again

**Success Criteria:**
- Errors are caught and displayed
- Recovery is automatic
- No need to manually restart

---

### Test 8: Multiple File Changes 📝

**Steps:**
1. Edit first file, save
2. Wait for preview to update
3. Edit second file, save
4. Wait for preview to update
5. Edit third file, save
6. Wait for preview to update

**Expected Result:**
- ✅ Each change triggers hot reload
- ✅ All changes appear in preview
- ✅ No missed updates
- ✅ System remains stable

**Success Criteria:**
- All changes are reflected
- No degradation over time
- Preview stays connected

---

### Test 9: Rapid Changes (Debouncing) ⚡

**Steps:**
1. Type quickly in the editor
2. Make multiple changes without saving
3. Save once
4. Watch preview

**Expected Result:**
- ✅ Preview waits for 300ms debounce
- ✅ Only triggers one reload
- ✅ Shows all accumulated changes
- ✅ Doesn't overwhelm the system

**Success Criteria:**
- Smart debouncing works
- No excessive reloads
- Final state is correct

---

### Test 10: App Switching 🔄

**Steps:**
1. Open Expo App A
2. Wait for preview to load
3. Switch to Expo App B
4. Wait for preview to load
5. Switch back to App A

**Expected Result:**
- ✅ Preview updates for each app
- ✅ Hot reload stops for inactive app
- ✅ Hot reload starts for active app
- ✅ No memory leaks

**Success Criteria:**
- Smooth app switching
- Correct preview for each app
- Resources cleaned up properly

---

## 🐛 Troubleshooting

### Issue: Preview Doesn't Load

**Check:**
1. Is Metro bundler running? (Check terminal output)
2. Is port 8081 available?
3. Any errors in console?

**Solution:**
- Wait 30 seconds for Metro to start
- Check for port conflicts
- Try clicking refresh button

---

### Issue: Hot Reload Not Working

**Check:**
1. Are you saving the file?
2. Is file watching active?
3. Any console errors?

**Debug:**
```typescript
// Check if hot reload is active
const ipcClient = IpcClient.getInstance();
const status = await ipcClient.snackIsWatching({ appId: [yourAppId] });
console.log('Watching:', status.isWatching);
```

**Solution:**
- Check browser console for "🔥 Hot reload" messages
- Verify file extension is watched (.tsx, .ts, .js, .jsx)
- Try manual refresh

---

### Issue: "Disconnected" Status

**Check:**
1. Is Expo server still running?
2. Any Metro errors in terminal?
3. Network issues?

**Solution:**
- Restart preview
- Check Metro bundler logs
- Verify localhost:8081 is accessible

---

### Issue: QR Code Not Working

**Check:**
1. Is tunnel enabled?
2. Do you have Expo Go installed?
3. Is your phone on same network?

**Solution:**
- Ensure `useTunnel: true` in Expo start options
- Install Expo Go from App Store / Play Store
- Check network connectivity

---

## 📊 Performance Benchmarks

### Expected Metrics

| Metric | Target | Good | Needs Work |
|--------|--------|------|------------|
| **Initial Load** | < 10s | < 15s | > 15s |
| **Hot Reload** | < 500ms | < 1s | > 1s |
| **File Detection** | < 100ms | < 200ms | > 200ms |
| **Device Switch** | Instant | < 500ms | > 500ms |
| **QR Generation** | < 1s | < 2s | > 2s |

### Measuring Performance

**In Browser Console:**
```javascript
// Check hot reload time
const start = Date.now();
// Make a change
// After reload completes:
const reloadTime = Date.now() - start;
console.log(`Hot reload took: ${reloadTime}ms`);
```

---

## ✅ Success Checklist

After testing, verify:

### Core Functionality
- [ ] Preview loads successfully
- [ ] Hot reload works automatically
- [ ] Changes appear in < 1 second
- [ ] Device frames switch correctly
- [ ] QR code generates properly

### User Experience
- [ ] Status indicators are clear
- [ ] No confusing error messages
- [ ] UI is responsive
- [ ] No performance issues
- [ ] Everything "just works"

### Reliability
- [ ] No crashes
- [ ] No memory leaks
- [ ] Works after multiple app switches
- [ ] Recovers from errors gracefully
- [ ] Stable over extended use

---

## 🎯 Pass/Fail Criteria

### PASS ✅
If you can:
1. Open an Expo app
2. Edit a file
3. See changes in < 1 second
4. Switch device frames smoothly
5. Generate QR code successfully

**Result:** Ship it! 🚀

### NEEDS WORK ⚠️
If:
1. Hot reload takes > 2 seconds
2. Changes don't appear automatically
3. Frequent disconnections
4. Errors are common
5. UI is confusing

**Result:** Debug and fix issues

### FAIL ❌
If:
1. Preview doesn't load at all
2. Hot reload never works
3. Crashes frequently
4. Unusable UI
5. Critical bugs

**Result:** Review implementation

---

## 📝 Feedback Template

After testing, document your findings:

```markdown
## Test Results - [Date]

### Environment
- OS: [Windows/Mac/Linux]
- Applaa Version: [version]
- Node Version: [version]
- Expo SDK: [version]

### Test Results
- [ ] Preview Loading: [Pass/Fail]
- [ ] Hot Reload: [Pass/Fail]
- [ ] Device Frames: [Pass/Fail]
- [ ] QR Code: [Pass/Fail]
- [ ] Error Handling: [Pass/Fail]

### Performance
- Initial Load: [X seconds]
- Hot Reload: [X ms]
- Device Switch: [X ms]

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Rating
[⭐⭐⭐⭐⭐] out of 5 stars

### Recommendation
[Ship it / Needs minor fixes / Major issues]
```

---

## 🚀 Ready to Test!

**Next Steps:**
1. Run `npm start`
2. Open/Create an Expo app
3. Follow Test Scenarios above
4. Document your findings
5. Report any issues

**Good luck!** 🎉

---

**Created:** October 5, 2025  
**Component:** SnackPoweredPreview  
**Target:** Professional Expo preview with Snack-quality hot reload

