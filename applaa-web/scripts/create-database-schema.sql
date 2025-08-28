-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'team');
CREATE TYPE app_type AS ENUM ('web', 'expo', 'flutter');
CREATE TYPE app_status AS ENUM ('creating', 'ready', 'building', 'error');
CREATE TYPE dev_environment_status AS ENUM ('starting', 'running', 'stopped', 'error');
CREATE TYPE mcp_service_type AS ENUM ('playwright', 'semgrep', 'flutter');
CREATE TYPE mcp_operation_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE team_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE message_role AS ENUM ('user', 'assistant');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  skill_level skill_level DEFAULT 'beginner',
  subscription_tier subscription_tier DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apps table
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type app_type NOT NULL,
  template_id TEXT,
  status app_status DEFAULT 'creating',
  preview_url TEXT,
  repository_url TEXT,
  deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App files table (virtual file system)
CREATE TABLE app_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT, -- Cached for text files, NULL for binaries
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  hash TEXT NOT NULL, -- SHA-256 hash for integrity
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, path)
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agent_type TEXT, -- UI/UX, Security, QA, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB, -- Additional data like agent context, code snippets, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User agents configuration
CREATE TABLE user_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- UI/UX, Security, QA, ASO/SEO, BAU, Deployment, Analytics
  configuration JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, agent_type)
);

-- Development environments table
CREATE TABLE dev_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  container_id TEXT, -- Docker container ID
  status dev_environment_status DEFAULT 'stopped',
  preview_url TEXT,
  port INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id) -- One dev environment per app
);

-- MCP service logs table
CREATE TABLE mcp_service_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  service_type mcp_service_type NOT NULL,
  operation TEXT NOT NULL,
  status mcp_operation_status DEFAULT 'pending',
  input_data JSONB NOT NULL,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table (collaboration)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(app_id, user_id)
);

-- Usage analytics table
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_apps_user_id ON apps(user_id);
CREATE INDEX idx_apps_type ON apps(type);
CREATE INDEX idx_app_files_app_id ON app_files(app_id);
CREATE INDEX idx_app_files_path ON app_files(app_id, path);
CREATE INDEX idx_chats_app_id ON chats(app_id);
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX idx_dev_environments_app_id ON dev_environments(app_id);
CREATE INDEX idx_mcp_service_logs_app_id ON mcp_service_logs(app_id);
CREATE INDEX idx_mcp_service_logs_service_type ON mcp_service_logs(service_type);
CREATE INDEX idx_team_members_app_id ON team_members(app_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_event_type ON usage_analytics(event_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_files_updated_at BEFORE UPDATE ON app_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_agents_updated_at BEFORE UPDATE ON user_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dev_environments_updated_at BEFORE UPDATE ON dev_environments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_service_logs_updated_at BEFORE UPDATE ON mcp_service_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Apps access based on ownership or team membership
CREATE POLICY "Users can view own apps" ON apps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view team apps" ON apps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.app_id = apps.id 
    AND team_members.user_id = auth.uid() 
    AND team_members.accepted_at IS NOT NULL
  )
);
CREATE POLICY "Users can create apps" ON apps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own apps" ON apps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own apps" ON apps FOR DELETE USING (auth.uid() = user_id);

-- App files access based on app access
CREATE POLICY "Users can view app files" ON app_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = app_files.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);
CREATE POLICY "Users can manage app files" ON app_files FOR ALL USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = app_files.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.role IN ('owner', 'editor')
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

-- Similar policies for other tables...
CREATE POLICY "Users can view app chats" ON chats FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = chats.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

CREATE POLICY "Users can create chats" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON chats FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view chat messages" ON chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_messages.chat_id 
    AND (chats.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM apps 
      WHERE apps.id = chats.app_id 
      AND (apps.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.app_id = apps.id 
        AND team_members.user_id = auth.uid() 
        AND team_members.accepted_at IS NOT NULL
      ))
    ))
  )
);

CREATE POLICY "Users can create chat messages" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_messages.chat_id 
    AND chats.user_id = auth.uid()
  )
);

-- User agents policies
CREATE POLICY "Users can manage own agents" ON user_agents FOR ALL USING (auth.uid() = user_id);

-- Dev environments policies
CREATE POLICY "Users can view dev environments" ON dev_environments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = dev_environments.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

CREATE POLICY "Users can manage dev environments" ON dev_environments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = dev_environments.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.role IN ('owner', 'editor')
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

-- MCP service logs policies
CREATE POLICY "Users can view mcp logs" ON mcp_service_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = mcp_service_logs.app_id 
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

-- Team members policies
CREATE POLICY "Users can view team members" ON team_members FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = team_members.app_id 
    AND apps.user_id = auth.uid()
  )
);

CREATE POLICY "App owners can manage team members" ON team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id = team_members.app_id 
    AND apps.user_id = auth.uid()
  )
);

-- Usage analytics policies
CREATE POLICY "Users can view own analytics" ON usage_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create analytics" ON usage_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for app files
INSERT INTO storage.buckets (id, name, public) VALUES ('app-files', 'app-files', false);

-- Storage policies
CREATE POLICY "Users can view own app files" ON storage.objects FOR SELECT USING (
  bucket_id = 'app-files' AND 
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id::text = split_part(name, '/', 1)
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

CREATE POLICY "Users can upload to own apps" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'app-files' AND 
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id::text = split_part(name, '/', 1)
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.role IN ('owner', 'editor')
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

CREATE POLICY "Users can update own app files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'app-files' AND 
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id::text = split_part(name, '/', 1)
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.role IN ('owner', 'editor')
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);

CREATE POLICY "Users can delete own app files" ON storage.objects FOR DELETE USING (
  bucket_id = 'app-files' AND 
  EXISTS (
    SELECT 1 FROM apps 
    WHERE apps.id::text = split_part(name, '/', 1)
    AND (apps.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.app_id = apps.id 
      AND team_members.user_id = auth.uid() 
      AND team_members.role IN ('owner', 'editor')
      AND team_members.accepted_at IS NOT NULL
    ))
  )
);