-- Fix user_apps table schema: Support both user_email (old) and user_display_name (new)
-- This migration handles the transition gracefully

-- Step 1: Add user_display_name column if it doesn't exist
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Step 2: Make user_email nullable (so we can transition)
ALTER TABLE public.user_apps 
ALTER COLUMN user_email DROP NOT NULL;

-- Step 3: Migrate data from user_email to user_display_name
-- For existing records, use email as display_name temporarily
UPDATE public.user_apps 
SET user_display_name = COALESCE(user_display_name, user_email || ' (migrated)')
WHERE user_display_name IS NULL AND user_email IS NOT NULL;

-- Step 4: For new records, we'll use display_name
-- Make user_display_name NOT NULL for new inserts (but allow NULL during migration)
-- We'll handle this with a check constraint instead

-- Step 5: Update unique constraint to use user_display_name
-- Drop old constraint if it exists
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_email_local_app_id_key;

-- Add new constraint with user_display_name
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_display_name_local_app_id_key;

ALTER TABLE public.user_apps 
ADD CONSTRAINT user_apps_user_display_name_local_app_id_key 
UNIQUE(user_display_name, local_app_id);

-- Step 6: Update indexes
DROP INDEX IF EXISTS user_apps_user_email_idx;
CREATE INDEX IF NOT EXISTS user_apps_user_display_name_idx ON public.user_apps(user_display_name);

-- Step 7: Update RLS policies
DROP POLICY IF EXISTS "user_apps_select_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_update_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_insert_own" ON public.user_apps;

CREATE POLICY "user_apps_select_own" ON public.user_apps 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_apps_update_own" ON public.user_apps 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "user_apps_insert_own" ON public.user_apps 
FOR INSERT TO authenticated WITH CHECK (true);

-- Step 8: Add check constraint to ensure at least one identifier is present
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_identifier_check;

ALTER TABLE public.user_apps 
ADD CONSTRAINT user_apps_identifier_check 
CHECK (user_display_name IS NOT NULL OR user_email IS NOT NULL);

-- Step 9: IMPORTANT - Update existing records with your actual WordPress display_name
-- Replace 'patidarmk' with your actual display_name if different
-- Replace 'your-email@example.com' with your actual email
-- UPDATE public.user_apps 
-- SET user_display_name = 'patidarmk'
-- WHERE user_email = 'your-email@example.com';

-- Step 10: After verifying everything works, you can optionally:
-- - Make user_display_name NOT NULL: ALTER TABLE public.user_apps ALTER COLUMN user_display_name SET NOT NULL;
-- - Drop user_email column: ALTER TABLE public.user_apps DROP COLUMN IF EXISTS user_email;

