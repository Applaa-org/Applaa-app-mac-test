-- Add first_name and last_name columns to profiles table
-- These fields allow users to have separate first and last names instead of just full_name

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index on first_name and last_name for faster lookups (optional)
CREATE INDEX IF NOT EXISTS profiles_first_name_idx ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS profiles_last_name_idx ON public.profiles(last_name);

-- Migrate existing full_name data to first_name if full_name exists and first_name is null
-- This is a one-time migration for existing data
UPDATE public.profiles
SET first_name = full_name
WHERE first_name IS NULL AND full_name IS NOT NULL;
