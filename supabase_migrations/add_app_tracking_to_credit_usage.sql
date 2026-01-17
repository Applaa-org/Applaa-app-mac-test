-- Add app_id and chat_id columns to credit_usage table
-- This migration adds columns to track which app and chat used tokens/credits

-- Add app_id column (nullable - for operations not tied to a specific app)
ALTER TABLE public.credit_usage 
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- Add chat_id column (nullable - for operations not tied to a specific chat)
ALTER TABLE public.credit_usage 
ADD COLUMN IF NOT EXISTS chat_id TEXT;

-- Extract existing app_id and chat_id from metadata JSONB for existing records
-- This backfills data for records that already have app_id/chat_id in metadata
UPDATE public.credit_usage
SET app_id = metadata->>'appId'
WHERE app_id IS NULL AND metadata->>'appId' IS NOT NULL;

UPDATE public.credit_usage
SET chat_id = metadata->>'chatId'
WHERE chat_id IS NULL AND metadata->>'chatId' IS NOT NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS credit_usage_app_id_idx ON public.credit_usage(app_id);
CREATE INDEX IF NOT EXISTS credit_usage_chat_id_idx ON public.credit_usage(chat_id);

-- Create composite index for user-specific app queries
CREATE INDEX IF NOT EXISTS credit_usage_user_app_idx ON public.credit_usage(user_id, app_id);

-- Create composite index for app-specific token/credit queries
CREATE INDEX IF NOT EXISTS credit_usage_app_created_idx ON public.credit_usage(app_id, created_at DESC);
