# Debugging WordPress Login and Supabase Sync

## Issue: "No WordPress user display_name found"

This error means the app can't find your WordPress user information. Here's how to fix it:

## Step 1: Check WordPress Login Status

Run this in the browser console:

```javascript
// Check WordPress login status
const wpUser = await window.electron.ipcRenderer.invoke("wordpress:get-current-user");
console.log("WordPress User:", wpUser);

if (wpUser.isAuthenticated && wpUser.user) {
  console.log("✅ Logged in as:", wpUser.user.display_name);
  console.log("   Email:", wpUser.user.email);
  console.log("   Username:", wpUser.user.username);
} else {
  console.log("❌ Not logged in - please log in with WordPress");
}
```

## Step 2: If Not Logged In

1. **Log in with WordPress**:
   - Go to the app's login/settings page
   - Enter your WordPress credentials
   - Make sure login is successful

2. **Verify login worked**:
   ```javascript
   const wpUser = await window.electron.ipcRenderer.invoke("wordpress:get-current-user");
   console.log("After login:", wpUser);
   ```

## Step 3: If Logged In But display_name is Missing

If you're logged in but `display_name` is null or missing:

1. **Check your WordPress profile**:
   - Make sure your WordPress account has a display name set
   - Go to WordPress admin → Users → Your Profile
   - Set a "Display Name" (not just username)

2. **Re-login** to refresh the user data:
   - Log out
   - Log back in
   - This will sync the latest WordPress user data

## Step 4: Test Again

After logging in, run the test again:

```javascript
const testResult = await window.electron.ipcRenderer.invoke("test-supabase-connection");
console.log("Test Result:", testResult);

if (testResult.results.wordpress.hasDisplayName) {
  console.log("✅ WordPress display_name found:", testResult.results.wordpress.displayName);
} else {
  console.error("❌ Still no display_name");
  console.log("Full WordPress info:", testResult.results.wordpress);
}
```

## Step 5: Sync Apps After Login

Once WordPress login is working:

```javascript
// Sync all apps
const syncResult = await window.electron.ipcRenderer.invoke("sync-all-apps-to-supabase");
console.log("Sync Result:", syncResult);

// Verify apps are in Supabase
const listResult = await window.electron.ipcRenderer.invoke("list-apps-in-supabase");
console.log("Apps in Supabase:", listResult);
```

## Common Issues

### Issue: "isAuthenticated: false"
**Solution**: You need to log in with WordPress first.

### Issue: "display_name: null"
**Solution**: 
1. Check your WordPress profile has a display name
2. Re-login to refresh user data
3. Make sure the WordPress API returns display_name

### Issue: "hasUser: false"
**Solution**: The login didn't save user data properly. Try logging out and back in.

## Quick Fix Script

Run this to check everything at once:

```javascript
// 1. Check WordPress
const wpUser = await window.electron.ipcRenderer.invoke("wordpress:get-current-user");
console.log("1. WordPress:", wpUser.isAuthenticated ? `✅ ${wpUser.user?.display_name}` : "❌ Not logged in");

// 2. Test Supabase connection
const test = await window.electron.ipcRenderer.invoke("test-supabase-connection");
console.log("2. Supabase Test:", test.success ? "✅ Passed" : "❌ Failed");
console.log("   WordPress:", test.results.wordpress);

// 3. If logged in, sync apps
if (wpUser.isAuthenticated && test.success) {
  const sync = await window.electron.ipcRenderer.invoke("sync-all-apps-to-supabase");
  console.log("3. Sync:", sync.message);
  
  const list = await window.electron.ipcRenderer.invoke("list-apps-in-supabase");
  console.log("4. Apps in Supabase:", list.userAppsCount || 0);
}
```

