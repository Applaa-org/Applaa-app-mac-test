-- Add smart naming columns to apps
ALTER TABLE `apps` ADD COLUMN `display_name` text;
ALTER TABLE `apps` ADD COLUMN `package_id` text;
ALTER TABLE `apps` ADD COLUMN `slug` text;

-- Optional: simple indexes for lookups
CREATE INDEX IF NOT EXISTS `idx_apps_slug` ON `apps`(`slug`);




