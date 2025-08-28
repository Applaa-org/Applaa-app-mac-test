-- Add category column to prompts table
ALTER TABLE `prompts` ADD COLUMN `category` text DEFAULT 'General';