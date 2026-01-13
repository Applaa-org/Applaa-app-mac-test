# Supabase Migrations

Run these SQL migrations in order in your Supabase dashboard.

## Migration Order

**IMPORTANT**: Run migrations in this exact order:

### 1. Create Profiles Table (REQUIRED for subscriptions)

Run: `create_profiles_table.sql`

This creates the `profiles` table for WordPress user data and subscription management. **This is REQUIRED** if you want to use subscriptions.

**Fields include:**
- User profile data (email, full_name, avatar_url)
- `subscription_tier` (free/pro)
- `stripe_customer_id` (for Stripe integration)
- `trial_start` and `trial_end` (for trial management)
- WordPress user fields (for WordPress auth sync)

### 2. Create Subscriptions Table (Optional - for Stripe integration)

Run: `create_subscriptions_table.sql`

This creates the `subscriptions` table for Stripe subscription management. **Requires profiles table to exist first.**

**Note:** This table has a foreign key reference to `profiles(id)`, so you MUST run `create_profiles_table.sql` first.

### 3. Create User Apps Table

Run: `create_user_apps_table.sql`

This creates the `user_apps` table for syncing app data. **Uses `user_display_name` (not email)**.

### 4. Update Existing Table (If you already created with user_email)

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

After running the migrations, verify:

1. **Profiles table exists**:
   ```sql
   SELECT * FROM public.profiles LIMIT 1;
   ```

2. **Subscriptions table exists** (if you ran it):
   ```sql
   SELECT * FROM public.subscriptions LIMIT 1;
   ```

3. **User apps table exists**:
   ```sql
   SELECT * FROM public.user_apps LIMIT 1;
   ```

4. **RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('profiles', 'subscriptions', 'user_apps');
   ```

## Troubleshooting

### Error: "relation public.profiles does not exist"

**Solution**: Run `create_profiles_table.sql` first. This table is required before creating:
- `subscriptions` table (has foreign key to profiles)
- `user_apps` table (if it references profiles)

### Error: "relation public.subscriptions does not exist" or foreign key constraint fails

**Solution**: Make sure you ran `create_profiles_table.sql` BEFORE `create_subscriptions_table.sql`. The subscriptions table has a foreign key reference to profiles.

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

