-- Create game_templates table for storing game template ideas
-- Used in the "Choose from 1000's of Game templates" section

CREATE TABLE IF NOT EXISTS public.game_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  details TEXT NOT NULL, -- Full prompt/details for the template
  preview_url TEXT, -- Optional preview URL
  image_url TEXT, -- Optional image URL for display
  emoji TEXT, -- Optional emoji icon
  app_type TEXT NOT NULL CHECK (app_type IN ('web', 'expo', 'flutter', 'godot')), -- Platform type
  is_default BOOLEAN DEFAULT false, -- Mark default templates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, app_type) -- Prevent duplicate template names per app type
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.game_templates ENABLE ROW LEVEL SECURITY;

-- Create secure policies

-- Allow everyone to read templates (public read access)
CREATE POLICY "game_templates_select_all" ON public.game_templates 
FOR SELECT 
USING (true);

-- Only authenticated users can insert (add new templates)
CREATE POLICY "game_templates_insert_authenticated" ON public.game_templates 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "game_templates_update_authenticated" ON public.game_templates 
FOR UPDATE TO authenticated 
USING (true);

-- Only authenticated users can delete
CREATE POLICY "game_templates_delete_authenticated" ON public.game_templates 
FOR DELETE TO authenticated 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS game_templates_name_idx ON public.game_templates(name);
CREATE INDEX IF NOT EXISTS game_templates_app_type_idx ON public.game_templates(app_type);
CREATE INDEX IF NOT EXISTS game_templates_is_default_idx ON public.game_templates(is_default);
CREATE INDEX IF NOT EXISTS game_templates_created_at_idx ON public.game_templates(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_game_templates_updated_at ON public.game_templates;
CREATE TRIGGER update_game_templates_updated_at
    BEFORE UPDATE ON public.game_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_game_templates_updated_at();

