# Testing App Sync to Supabase

## Prerequisites

✅ **Tables Created**: Both `profiles` and `user_apps` tables exist in Supabase
✅ **Environment Variables**: `.env` has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
✅ **WordPress Login**: User must be logged in via WordPress

## Step 1: Verify WordPress Login

Make sure you're logged in with WordPress:

1. Open the app
2. Check if you're logged in (WordPress authentication)
3. Your email should be stored in settings

You can verify in browser console:
```javascript
// Check WordPress user
window.electron.ipcRenderer.invoke("wordpress:get-current-user").then(result => {
  console.log("WordPress User:", result);
});
```

## Step 2: Test App Sync

### Option A: Create a New App

1. Create a new app in the app
2. The app should automatically sync to Supabase
3. Check Supabase dashboard → `user_apps` table
4. You should see the new app with your WordPress email

### Option B: Sync Existing App

If you already have apps, you can manually trigger sync:

1. Open browser console in the app
2. Run:
```javascript
// Get your apps
window.electron.ipcRenderer.invoke("list-apps").then(apps => {
  console.log("Your apps:", apps);
  
  // Sync first app (replace with actual app ID)
  if (apps.length > 0) {
    const appId = apps[0].id;
    // The sync happens automatically on updates, but you can also trigger it
    console.log(`App ${appId} will sync on next update`);
  }
});
```

## Step 3: Verify in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Select `user_apps` table
4. You should see:
   - `user_email`: Your WordPress email
   - `local_app_id`: The app ID from SQLite
   - `app_name`: App name
   - All other app fields

## Step 4: Test Updates

1. Update an app (connect Vercel, GitHub, or change deployment URL)
2. Check Supabase `user_apps` table
3. The app should be updated automatically

## Troubleshooting

### No apps syncing?

1. **Check WordPress login**:
   ```javascript
   window.electron.ipcRenderer.invoke("wordpress:get-current-user")
   ```

2. **Check Supabase config**:
   - Verify `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Restart the app after adding env vars

3. **Check logs**:
   - Look at the terminal/console where the app is running
   - Look for "App synced to Supabase" or error messages

### Apps syncing but wrong user?

- Make sure you're logged in with the correct WordPress account
- The sync uses the email from `settings.wordpressAuth.user.email`

### Sync errors?

- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify the `user_apps` table exists and has correct schema
- Check Supabase logs for detailed error messages

## Manual Sync (if needed)

If you need to manually sync an app, you can add this to a handler or use it in browser console:

```typescript
import { syncAppByIdToSupabase } from '@/lib/supabase_app_sync';
await syncAppByIdToSupabase(appId);
```

