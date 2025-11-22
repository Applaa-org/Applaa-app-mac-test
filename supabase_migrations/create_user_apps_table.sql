-- Create user_apps table for syncing app data from SQLite to Supabase
-- This table stores app data synced from local SQLite database, associated with user email

CREATE TABLE IF NOT EXISTS public.user_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_display_name TEXT NOT NULL, -- WordPress user display_name (unique identifier)
  local_app_id INTEGER NOT NULL, -- Local SQLite app ID
  app_name TEXT NOT NULL,
  app_type TEXT DEFAULT 'web' CHECK (app_type IN ('web', 'mobile', 'godot')),
  local_path TEXT,
  status TEXT DEFAULT 'ready',
  
  -- GitHub fields
  github_org TEXT,
  github_repo TEXT,
  github_branch TEXT,
  github_repo_url TEXT,
  
  -- Vercel fields
  vercel_project_id TEXT,
  vercel_project_name TEXT,
  vercel_team_id TEXT,
  vercel_deployment_url TEXT,
  
  -- Supabase fields
  supabase_project_id TEXT,
  
  -- Neon fields
  neon_project_id TEXT,
  neon_development_branch_id TEXT,
  neon_preview_branch_id TEXT,
  
  -- EAS fields
  eas_build_url TEXT,
  eas_deployment_url TEXT,
  eas_project_id TEXT,
  eas_build_id TEXT,
  
  -- Local build fields
  local_apk_path TEXT,
  local_aab_path TEXT,
  local_ipa_path TEXT,
  local_apk_built_at TIMESTAMP WITH TIME ZONE,
  local_aab_built_at TIMESTAMP WITH TIME ZONE,
  local_ipa_built_at TIMESTAMP WITH TIME ZONE,
  
  -- Deployment fields
  deployment_status TEXT DEFAULT 'not_deployed',
  last_deployment_at TIMESTAMP WITH TIME ZONE,
  deployment_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one app per user_display_name + local_app_id combination
  UNIQUE(user_display_name, local_app_id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.user_apps ENABLE ROW LEVEL SECURITY;

-- Create secure policies
-- Service role can manage all apps (for sync operations)
CREATE POLICY "user_apps_service_role_all" ON public.user_apps 
FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own apps (by display_name)
-- Note: Since we're using service role for sync, these policies are for future authenticated access
CREATE POLICY "user_apps_select_own" ON public.user_apps 
FOR SELECT TO authenticated 
USING (true); -- Allow authenticated users to see all for now (can restrict later if needed)

-- Users can only update their own apps
CREATE POLICY "user_apps_update_own" ON public.user_apps 
FOR UPDATE TO authenticated 
USING (true); -- Allow authenticated users to update all for now

-- Users can only insert their own apps
CREATE POLICY "user_apps_insert_own" ON public.user_apps 
FOR INSERT TO authenticated 
WITH CHECK (true); -- Allow authenticated users to insert for now

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_apps_user_display_name_idx ON public.user_apps(user_display_name);
CREATE INDEX IF NOT EXISTS user_apps_local_app_id_idx ON public.user_apps(local_app_id);
CREATE INDEX IF NOT EXISTS user_apps_app_name_idx ON public.user_apps(app_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_apps_updated_at ON public.user_apps;
CREATE TRIGGER update_user_apps_updated_at
    BEFORE UPDATE ON public.user_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_user_apps_updated_at();

