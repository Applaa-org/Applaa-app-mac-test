-- Update subscription_tier CHECK constraint to include 'ultra' and 'business'
-- This migration updates existing profiles table to support new subscription tiers

-- First, drop the existing CHECK constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

-- Add new CHECK constraint with all subscription tiers
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'pro', 'ultra', 'business'));

-- Update monthly_credits defaults based on new pricing model
-- Free: 50 credits/month
-- Pro: 500 credits/month
-- Ultra: Will be set based on tier (custom logic in app)
-- Business: Will be set based on tier (custom logic in app)
UPDATE public.profiles
SET monthly_credits = CASE 
  WHEN subscription_tier = 'pro' THEN 500
  WHEN subscription_tier = 'ultra' THEN 1000  -- Default for Ultra, can be customized
  WHEN subscription_tier = 'business' THEN 2000  -- Default for Business, can be customized
  ELSE 50  -- Free tier
END
WHERE monthly_credits IS NULL OR monthly_credits = 0;
