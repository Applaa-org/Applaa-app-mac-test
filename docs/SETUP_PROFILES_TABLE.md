# Setup Profiles Table in Supabase

The `profiles` table is required for subscription management. Follow these steps to create it in your Supabase database.

## Steps to Create the Table

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration**
   - Copy the entire contents of `supabase_migrations/create_profiles_table.sql`
   - Paste it into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify the Table**
   - After running, verify the table was created:
   ```sql
   SELECT * FROM public.profiles LIMIT 1;
   ```

## What This Creates

The migration creates:
- ✅ `profiles` table with all required fields
- ✅ `subscription_tier` field (defaults to 'free')
- ✅ `stripe_customer_id` field (for Stripe integration)
- ✅ `trial_start` and `trial_end` fields (for trial management)
- ✅ WordPress user fields (for WordPress auth sync)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Auto-update trigger for `updated_at`

## Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or manually:

```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase_migrations/create_profiles_table.sql
```

## Troubleshooting

### Error: "relation public.profiles already exists"
The table already exists. You can either:
- Drop it first: `DROP TABLE IF EXISTS public.profiles CASCADE;`
- Or skip this step if the table structure is correct

### Error: "permission denied"
Make sure you're using the Supabase Dashboard SQL Editor (has admin permissions) or using the service role key.

### Missing Fields
If you need to add missing fields after the table is created:

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;
```
