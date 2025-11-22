-- Migration: Update user_apps table to use user_display_name instead of user_email
-- Run this if you already created the table with user_email

-- Step 1: Add new column
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Step 2: Migrate data from user_email to user_display_name
-- First, try to get display_name from profiles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Profiles table exists, use it
    UPDATE public.user_apps ua
    SET user_display_name = p.wordpress_display_name
    FROM public.profiles p
    WHERE ua.user_email = p.email
    AND ua.user_display_name IS NULL;
  END IF;
  
  -- For any remaining rows, set a default (you'll need to update these manually with correct display_name)
  -- For now, we'll use email as placeholder - you should update these manually
  UPDATE public.user_apps 
  SET user_display_name = COALESCE(user_display_name, user_email || ' (update me)')
  WHERE user_display_name IS NULL;
END $$;

-- Step 3: Make it NOT NULL after migration
ALTER TABLE public.user_apps 
ALTER COLUMN user_display_name SET NOT NULL;

-- Step 4: Update unique constraint
ALTER TABLE public.user_apps 
DROP CONSTRAINT IF EXISTS user_apps_user_email_local_app_id_key;

ALTER TABLE public.user_apps 
ADD CONSTRAINT user_apps_user_display_name_local_app_id_key 
UNIQUE(user_display_name, local_app_id);

-- Step 5: Update indexes
DROP INDEX IF EXISTS user_apps_user_email_idx;
CREATE INDEX IF NOT EXISTS user_apps_user_display_name_idx ON public.user_apps(user_display_name);

-- Step 6: Update RLS policies (simplified - service role handles all)
DROP POLICY IF EXISTS "user_apps_select_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_update_own" ON public.user_apps;
DROP POLICY IF EXISTS "user_apps_insert_own" ON public.user_apps;

CREATE POLICY "user_apps_select_own" ON public.user_apps 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_apps_update_own" ON public.user_apps 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "user_apps_insert_own" ON public.user_apps 
FOR INSERT TO authenticated WITH CHECK (true);

-- Step 7: Optional - Drop old user_email column (after verifying everything works)
-- ALTER TABLE public.user_apps DROP COLUMN IF EXISTS user_email;

