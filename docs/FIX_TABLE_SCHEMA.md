# Fix: Table Schema Mismatch

## Error
```
null value in column "user_email" of relation "user_apps" violates not-null constraint
```

## Problem
Your Supabase table still has the **old schema** with `user_email` column, but the code is trying to use the **new schema** with `user_display_name` column.

## Solution

### Step 1: Run the Migration

Go to your Supabase Dashboard → SQL Editor and run this migration:

**File**: `supabase_migrations/update_user_apps_to_display_name_simple.sql`

This will:
1. Add `user_display_name` column
2. Migrate data from `user_email` to `user_display_name`
3. Update constraints and indexes
4. Update RLS policies

### Step 2: Verify Migration

After running the migration, check the table structure:

```sql
-- Check if user_display_name column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_apps'
AND column_name IN ('user_email', 'user_display_name');
```

You should see `user_display_name` column.

### Step 3: Update Existing Data (if any)

If you have existing data with `user_email`, update it:

```sql
-- Get your WordPress display_name first (from the test results: "patidarmk")
-- Then update existing records
UPDATE public.user_apps 
SET user_display_name = 'patidarmk'  -- Replace with your actual display_name
WHERE user_email = 'your-email@example.com';  -- Replace with your email
```

### Step 4: Test Again

After running the migration, test again:

```javascript
const testResult = await window.electron.ipcRenderer.invoke("test-supabase-connection");
console.log("Test Result:", testResult);

if (testResult.results.testInsert.success) {
  console.log("✅ Table schema is correct!");
} else {
  console.error("❌ Still has issues:", testResult.results.testInsert.error);
}
```

### Step 5: Sync Apps

Once the test passes, sync your apps:

```javascript
const syncResult = await window.electron.ipcRenderer.invoke("sync-all-apps-to-supabase");
console.log("Sync Result:", syncResult);
```

## Alternative: Drop and Recreate Table

If you don't have important data, you can drop and recreate:

```sql
-- DROP existing table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS public.user_apps CASCADE;

-- Then run the create_user_apps_table.sql migration
-- File: supabase_migrations/create_user_apps_table.sql
```

## Quick Check

Run this to see your current table structure:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_apps'
ORDER BY ordinal_position;
```

