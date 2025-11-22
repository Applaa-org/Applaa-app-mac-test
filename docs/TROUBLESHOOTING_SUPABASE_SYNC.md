# Troubleshooting Supabase App Sync

## Issue: "Saved to Supabase" but can't see data

### Step 1: Update the Table Schema

**IMPORTANT**: The table schema has been updated to use `user_display_name` instead of `user_email`.

You need to update your existing table:

```sql
-- Run this in Supabase SQL Editor to update existing table

-- Add new column
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Migrate data from user_email to user_display_name (if you have existing data)
-- First, get display_name from profiles table
UPDATE public.user_apps ua
SET user_display_name = p.wordpress_display_name
FROM public.profiles p
WHERE ua.user_email = p.email
AND ua.user_display_name IS NULL;

-- Or if profiles don't exist, you can set a default
-- UPDATE public.user_apps SET user_display_name = user_email WHERE user_display_name IS NULL;

-- Make it NOT NULL after migration
ALTER TABLE public.user_apps 
ALTER COLUMN user_display_name SET NOT NULL;

-- Update unique constraint
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_email_local_app_id_key;

ALTER TABLE public.user_apps 
ADD CONSTRAINT user_apps_user_display_name_local_app_id_key 
UNIQUE(user_display_name, local_app_id);

-- Update indexes
DROP INDEX IF EXISTS user_apps_user_email_idx;
CREATE INDEX IF NOT EXISTS user_apps_user_display_name_idx ON public.user_apps(user_display_name);

-- Update RLS policies
DROP POLICY IF EXISTS "user_apps_select_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_update_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_insert_own" ON public.user_apps;

CREATE POLICY "user_apps_select_own" ON public.user_apps 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_apps_update_own" ON public.user_apps 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "user_apps_insert_own" ON public.user_apps 
FOR INSERT TO authenticated WITH CHECK (true);

-- Optional: Drop old user_email column (after verifying everything works)
-- ALTER TABLE public.user_apps DROP COLUMN IF EXISTS user_email;
```

### Step 2: Verify WordPress User

Check your WordPress user display_name:

```javascript
// In browser console
window.electron.ipcRenderer.invoke("wordpress:get-current-user").then(result => {
  console.log("User:", result.user);
  console.log("Display Name:", result.user?.display_name);
});
```

### Step 3: Verify Data in Supabase

**Option A: Using Service Role (Bypasses RLS)**

In Supabase SQL Editor, run:

```sql
-- View all apps (using service role bypasses RLS)
SELECT * FROM public.user_apps 
ORDER BY created_at DESC 
LIMIT 10;
```

**Option B: Check Specific User**

```sql
-- Replace 'Your Display Name' with your actual WordPress display_name
SELECT * FROM public.user_apps 
WHERE user_display_name = 'Your Display Name';
```

### Step 4: Test Sync with Verification

```javascript
// In browser console - sync and verify
const apps = await window.electron.ipcRenderer.invoke("list-apps");
console.log("Your apps:", apps);

if (apps.length > 0) {
  const appId = apps[0].id;
  
  // Sync
  const syncResult = await window.electron.ipcRenderer.invoke("sync-all-apps-to-supabase");
  console.log("Sync result:", syncResult);
  
  // Verify
  const verifyResult = await window.electron.ipcRenderer.invoke("verify-app-in-supabase", { appId });
  console.log("Verify result:", verifyResult);
  
  if (verifyResult.success) {
    console.log("✅ App found in Supabase:", verifyResult.data);
  } else {
    console.error("❌ App not found:", verifyResult.error);
  }
}
```

### Step 5: Check Logs

Look at the terminal/console where the app is running. You should see:
- `✅ App synced to Supabase (created/updated): ...`
- `   Supabase record ID: ...`
- `   ✅ Verified: App data exists in Supabase`

If you see errors, they will show the exact issue.

## Common Issues

### Issue: RLS Policies Blocking View

**Solution**: The service role should bypass RLS. Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key) in your `.env`.

### Issue: Wrong Display Name

**Solution**: Check your WordPress user display_name matches what's in Supabase:
```javascript
const wpUser = await window.electron.ipcRenderer.invoke("wordpress:get-current-user");
console.log("Display Name:", wpUser.user?.display_name);
```

### Issue: Table Column Mismatch

**Solution**: Run the migration SQL above to update the table schema.

### Issue: Data Exists But Not Visible

**Solution**: 
1. Check you're looking at the right table (`user_apps`)
2. Check the `user_display_name` column matches your WordPress display_name
3. Try querying with service role in SQL Editor (bypasses RLS)

## Quick Verification Query

Run this in Supabase SQL Editor to see all synced apps:

```sql
SELECT 
  id,
  user_display_name,
  local_app_id,
  app_name,
  app_type,
  vercel_deployment_url,
  github_repo_url,
  created_at,
  updated_at
FROM public.user_apps
ORDER BY updated_at DESC;
```

