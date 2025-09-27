PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_apps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`github_org` text,
	`github_repo` text,
	`github_branch` text,
	`supabase_project_id` text,
	`neon_project_id` text,
	`neon_development_branch_id` text,
	`neon_preview_branch_id` text,
	`vercel_project_id` text,
	`vercel_project_name` text,
	`vercel_team_id` text,
	`vercel_deployment_url` text,
	`github_repo_url` text,
	`eas_build_url` text,
	`eas_deployment_url` text,
	`eas_project_id` text,
	`eas_build_id` text,
	`local_apk_path` text,
	`local_aab_path` text,
	`local_ipa_path` text,
	`local_apk_built_at` integer,
	`local_aab_built_at` integer,
	`local_ipa_built_at` integer,
	`deployment_status` text DEFAULT 'not_deployed',
	`last_deployment_at` integer,
	`deployment_notes` text,
	`chat_context` text,
	`app_type` text DEFAULT 'web',
	`status` text DEFAULT 'active'
);
--> statement-breakpoint
INSERT INTO `__new_apps`("id", "name", "path", "created_at", "updated_at", "github_org", "github_repo", "github_branch", "supabase_project_id", "neon_project_id", "neon_development_branch_id", "neon_preview_branch_id", "vercel_project_id", "vercel_project_name", "vercel_team_id", "vercel_deployment_url", "github_repo_url", "eas_build_url", "eas_deployment_url", "eas_project_id", "eas_build_id", "local_apk_path", "local_aab_path", "local_ipa_path", "local_apk_built_at", "local_aab_built_at", "local_ipa_built_at", "deployment_status", "last_deployment_at", "deployment_notes", "chat_context", "app_type", "status") SELECT "id", "name", "path", "created_at", "updated_at", "github_org", "github_repo", "github_branch", "supabase_project_id", "neon_project_id", "neon_development_branch_id", "neon_preview_branch_id", "vercel_project_id", "vercel_project_name", "vercel_team_id", "vercel_deployment_url", "github_repo_url", "eas_build_url", "eas_deployment_url", "eas_project_id", "eas_build_id", "local_apk_path", "local_aab_path", "local_ipa_path", "local_apk_built_at", "local_aab_built_at", "local_ipa_built_at", "deployment_status", "last_deployment_at", "deployment_notes", "chat_context", "app_type", "status" FROM `apps`;--> statement-breakpoint
DROP TABLE `apps`;--> statement-breakpoint
ALTER TABLE `__new_apps` RENAME TO `apps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;