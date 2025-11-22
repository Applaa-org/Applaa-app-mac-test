-- Simple Migration: Update user_apps table to use user_display_name
-- This version doesn't require profiles table

-- Step 1: Add new column
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Step 2: Set a temporary value (you'll need to update manually with correct WordPress display_name)
-- For now, we'll copy from user_email as placeholder
UPDATE public.user_apps 
SET user_display_name = COALESCE(user_display_name, user_email || ' (update me)')
WHERE user_display_name IS NULL;

-- Step 3: Make it NOT NULL after setting values
ALTER TABLE public.user_apps 
ALTER COLUMN user_display_name SET NOT NULL;

-- Step 4: Update unique constraint
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_email_local_app_id_key;
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_display_name_local_app_id_key;

ALTER TABLE public.user_apps 
ADD CONSTRAINT user_apps_user_display_name_local_app_id_key 
UNIQUE(user_display_name, local_app_id);

-- Step 5: Update indexes
DROP INDEX IF EXISTS user_apps_user_email_idx;
CREATE INDEX IF NOT EXISTS user_apps_user_display_name_idx ON public.user_apps(user_display_name);

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "user_apps_select_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_update_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_insert_own" ON public.user_apps;

CREATE POLICY "user_apps_select_own" ON public.user_apps 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_apps_update_own" ON public.user_apps 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "user_apps_insert_own" ON public.user_apps 
FOR INSERT TO authenticated WITH CHECK (true);

-- Step 7: IMPORTANT - Update the display_name values manually
-- After running this migration, you need to update user_display_name with your actual WordPress display_name
-- Example:
-- UPDATE public.user_apps SET user_display_name = 'Your Actual Display Name' WHERE user_email = 'your-email@example.com';

-- Step 8: Optional - Drop old user_email column (after verifying everything works)
-- ALTER TABLE public.user_apps DROP COLUMN IF EXISTS user_email;

