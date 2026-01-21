-- Add credit tracking fields to profiles table
-- This migration adds remaining_credits, credits_last_reset, and total_credits_used fields

-- Add remaining_credits field (current balance)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS remaining_credits INTEGER;

-- Add credits_last_reset timestamp (for monthly resets)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_last_reset TIMESTAMP WITH TIME ZONE;

-- Add total_credits_used field (lifetime usage counter)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_credits_used INTEGER DEFAULT 0;

-- Initialize remaining_credits based on subscription tier if not set
-- Free: 50 credits
-- Pro: 500 credits
-- Ultra: 1000 credits (default, can be customized)
-- Business: 2000 credits (default, can be customized)
UPDATE public.profiles
SET remaining_credits = CASE 
  WHEN subscription_tier = 'pro' THEN 500
  WHEN subscription_tier = 'ultra' THEN 1000
  WHEN subscription_tier = 'business' THEN 2000
  ELSE 50
END
WHERE remaining_credits IS NULL;

-- Initialize credits_last_reset to created_at if not set
UPDATE public.profiles
SET credits_last_reset = created_at
WHERE credits_last_reset IS NULL;

-- Create index for faster credit balance lookups
CREATE INDEX IF NOT EXISTS profiles_remaining_credits_idx ON public.profiles(remaining_credits);

-- Create credit_usage table to track all credit transactions
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL CHECK (credits_used > 0),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on credit_usage table
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credit_usage
-- Service role can manage all credit usage records
CREATE POLICY "credit_usage_service_role_all" ON public.credit_usage 
FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own credit usage records
CREATE POLICY "credit_usage_select_own" ON public.credit_usage 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS credit_usage_user_id_idx ON public.credit_usage(user_id);
CREATE INDEX IF NOT EXISTS credit_usage_operation_type_idx ON public.credit_usage(operation_type);
CREATE INDEX IF NOT EXISTS credit_usage_created_at_idx ON public.credit_usage(created_at);
CREATE INDEX IF NOT EXISTS credit_usage_user_created_idx ON public.credit_usage(user_id, created_at DESC);
