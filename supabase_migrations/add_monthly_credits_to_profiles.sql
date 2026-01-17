-- Add monthly_credits column to profiles table
-- This column tracks the number of credits available to the user each month

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_credits INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_monthly_credits_idx ON public.profiles(monthly_credits);

-- Set default credits based on subscription tier
-- Free tier: 100 credits/month
-- Pro tier: 1000 credits/month
UPDATE public.profiles
SET monthly_credits = CASE 
  WHEN subscription_tier = 'pro' THEN 1000
  ELSE 100
END
WHERE monthly_credits = 0 OR monthly_credits IS NULL;
