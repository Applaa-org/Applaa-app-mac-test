-- Allow credit_usage rows with credits_used = 0 (token-only tracking when deduction didn't run)
-- Drop strict check (credits_used > 0) and allow credits_used >= 0

ALTER TABLE public.credit_usage
DROP CONSTRAINT IF EXISTS credit_usage_credits_used_check;

ALTER TABLE public.credit_usage
ADD CONSTRAINT credit_usage_credits_used_check CHECK (credits_used >= 0);
