# Supabase Migrations

Run these SQL migrations in order in your Supabase dashboard.

## Migration Order

**IMPORTANT**: Run migrations in this exact order:

### 1. Create Profiles Table (Optional - for WordPress user sync)

Run: `create_profiles_table.sql`

This creates the `profiles` table for WordPress user data. **This is optional** - you can skip it if you only want app sync.

### 2. Create User Apps Table

Run: `create_user_apps_table.sql`

This creates the `user_apps` table for syncing app data. **Uses `user_display_name` (not email)**.

### 3. Update Existing Table (If you already created with user_email)

If you already created the `user_apps` table with `user_email`, run: `update_user_apps_to_display_name_simple.sql`

This migrates from `user_email` to `user_display_name`.

## How to Run

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of the migration file
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for success message
7. Repeat for the next migration

## Verification

After running both migrations, verify:

1. **Profiles table exists**:
   ```sql
   SELECT * FROM public.profiles LIMIT 1;
   ```

2. **User apps table exists**:
   ```sql
   SELECT * FROM public.user_apps LIMIT 1;
   ```

3. **RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('profiles', 'user_apps');
   ```

## Troubleshooting

### Error: "relation public.profiles does not exist"

**Solution**: Run `create_profiles_table.sql` first, then `create_user_apps_table.sql`.

### Error: "permission denied"

**Solution**: Make sure you're using the Supabase Dashboard SQL Editor (has admin permissions).

### Error: "policy already exists"

**Solution**: The migration was partially run. Drop the existing policies first:
```sql
DROP POLICY IF EXISTS "user_apps_select_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_update_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_insert_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_service_role_all" ON public.user_apps;
```

Then re-run the migration.

