-- Add deployment URL fields to apps table for GitHub and Vercel integration
-- This migration ensures proper storage of deployment URLs

-- Add GitHub repository URL field
ALTER TABLE `apps` ADD COLUMN `github_repo_url` text;

-- Add Vercel deployment URL field (if not already exists)
-- Note: vercel_deployment_url was added in migration 0008, but we're ensuring it exists
-- ALTER TABLE `apps` ADD COLUMN `vercel_deployment_url` text;

-- Add deployment status field to track deployment state
ALTER TABLE `apps` ADD COLUMN `deployment_status` text DEFAULT 'not_deployed';

-- Add last deployment timestamp
ALTER TABLE `apps` ADD COLUMN `last_deployment_at` integer;

-- Add deployment notes field for additional information
ALTER TABLE `apps` ADD COLUMN `deployment_notes` text;
