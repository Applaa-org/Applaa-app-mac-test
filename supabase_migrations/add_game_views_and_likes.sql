-- Add view_count column to games table
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for view_count
CREATE INDEX IF NOT EXISTS games_view_count_idx ON public.games(view_count);

-- Create game_likes table to track which users liked which games
CREATE TABLE IF NOT EXISTS public.game_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_display_name TEXT NOT NULL, -- WordPress display_name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_display_name) -- Prevent duplicate likes from same user
);

-- Enable RLS on game_likes
ALTER TABLE public.game_likes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read likes
CREATE POLICY "game_likes_select_all" ON public.game_likes 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert likes
CREATE POLICY "game_likes_insert_authenticated" ON public.game_likes 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to delete their own likes
CREATE POLICY "game_likes_delete_authenticated" ON public.game_likes 
FOR DELETE TO authenticated 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS game_likes_game_id_idx ON public.game_likes(game_id);
CREATE INDEX IF NOT EXISTS game_likes_user_display_name_idx ON public.game_likes(user_display_name);

