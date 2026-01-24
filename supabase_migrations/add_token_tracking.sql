-- Add token tracking fields to profiles table
-- This migration adds total_tokens_used field to track lifetime token usage

-- Add total_tokens_used field (cumulative token usage)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS profiles_total_tokens_used_idx ON public.profiles(total_tokens_used);

-- Add tokens_used field to credit_usage table to track tokens per operation
ALTER TABLE public.credit_usage 
ADD COLUMN IF NOT EXISTS tokens_used BIGINT DEFAULT 0;

-- Create index for faster token usage queries
CREATE INDEX IF NOT EXISTS credit_usage_tokens_used_idx ON public.credit_usage(tokens_used);
CREATE INDEX IF NOT EXISTS credit_usage_user_tokens_idx ON public.credit_usage(user_id, tokens_used);

-- Initialize total_tokens_used to 0 for existing users if not set
UPDATE public.profiles
SET total_tokens_used = 0
WHERE total_tokens_used IS NULL;
