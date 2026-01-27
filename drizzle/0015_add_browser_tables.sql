-- Add Super Powers Browser tables
-- Migration: 0015_add_browser_tables

-- Browser Tabs table
CREATE TABLE IF NOT EXISTS `browser_tabs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT 'New Tab' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`chat_id` integer REFERENCES chats(id) ON DELETE CASCADE,
	`favicon_url` text,
	`is_active` integer DEFAULT 0,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Chat Embeddings table (Vector storage for RAG)
CREATE TABLE IF NOT EXISTS `chat_embeddings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
	`embedding` text NOT NULL,
	`embedding_model` text DEFAULT 'text-embedding-3-small' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- App Knowledge table (Code, errors, and success patterns)
CREATE TABLE IF NOT EXISTS `app_knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer REFERENCES apps(id) ON DELETE CASCADE,
	`content_type` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Automation Plans table
CREATE TABLE IF NOT EXISTS `automation_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tab_id` integer REFERENCES browser_tabs(id) ON DELETE CASCADE,
	`name` text NOT NULL,
	`description` text,
	`goal` text NOT NULL,
	`steps` text NOT NULL,
	`script_type` text DEFAULT 'playwright' NOT NULL,
	`script_content` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`embedding` text,
	`execution_log` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
