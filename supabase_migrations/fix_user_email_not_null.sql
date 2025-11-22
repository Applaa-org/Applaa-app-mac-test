-- Quick fix: Make user_email nullable so inserts work
-- Run this FIRST if you're getting "user_email violates not-null constraint" error

-- Step 1: Make user_email nullable (this allows inserts to work)
ALTER TABLE public.user_apps 
ALTER COLUMN user_email DROP NOT NULL;

-- Step 2: Add user_display_name if it doesn't exist
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Step 3: Verify the change
-- You can check with: SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'user_apps' AND column_name = 'user_email';

