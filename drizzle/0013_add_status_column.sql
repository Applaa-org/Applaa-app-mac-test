-- Migration: Add status column to apps table for parallel app creation
-- This enables the 3-phase parallel app creation architecture:
-- Phase 1: INSTANT (creating) - DB entries ready for immediate chat
-- Phase 2: BACKGROUND (building) - Template and git operations in parallel  
-- Phase 3: COMPLETE (ready) - App fully scaffolded and ready

ALTER TABLE `apps` ADD `status` text DEFAULT 'ready';

-- Update any existing apps to 'ready' status (they're already complete)
UPDATE `apps` SET `status` = 'ready' WHERE `status` IS NULL;
