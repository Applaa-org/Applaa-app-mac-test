-- Add username column to profiles table
-- This field stores a general username (not just WordPress username)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- Migrate existing wordpress_username to username if username is null
-- This is a one-time migration for existing data
UPDATE public.profiles
SET username = wordpress_username
WHERE username IS NULL AND wordpress_username IS NOT NULL;
