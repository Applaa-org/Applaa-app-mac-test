-- Add app_type column to apps table
ALTER TABLE `apps` ADD `app_type` text DEFAULT 'web';

-- Update existing Expo apps to have mobile type
-- We can identify Expo apps by checking if they have minimal files (likely Expo scaffolds)
-- For now, we'll set all existing apps to 'web' and let the user re-categorize if needed
-- This is safer than trying to auto-detect which could be wrong

