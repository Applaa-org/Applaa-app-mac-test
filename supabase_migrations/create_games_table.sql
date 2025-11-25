-- Create games table for storing all games (shared for all users)
-- Both default games and custom games added by users

CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  game_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false, -- Mark default games
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name) -- Prevent duplicate game names
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create secure policies
-- Note: Service role automatically bypasses RLS, but we add policies for authenticated users

-- Allow everyone to read games (public read access)
-- This allows both service role and authenticated users to read
CREATE POLICY "games_select_all" ON public.games 
FOR SELECT 
USING (true);

-- Only authenticated users can insert (add new games)
CREATE POLICY "games_insert_authenticated" ON public.games 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "games_update_authenticated" ON public.games 
FOR UPDATE TO authenticated 
USING (true);

-- Only authenticated users can delete
CREATE POLICY "games_delete_authenticated" ON public.games 
FOR DELETE TO authenticated 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS games_name_idx ON public.games(name);
CREATE INDEX IF NOT EXISTS games_is_default_idx ON public.games(is_default);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON public.games(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON public.games
    FOR EACH ROW
    EXECUTE FUNCTION update_games_updated_at();

-- Insert default games
INSERT INTO public.games (name, image_url, game_url, is_default) VALUES
('Endless Runner', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-3_48PM-300x300.png', 'https://endless-runner.vercel.app/', true),
('Math Tutorial Class 9', 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_05_02-PM-200x300.png', 'https://math-tutorial-class9.vercel.app/', true),
('Solitaire Card Game', 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-29-2025-12_00_58-PM-200x300.png', 'https://solitaire-card-game2.vercel.app/', true),
('Rock Paper Scissors', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_34AM-233x300.png', 'https://rock-paper-scissor-kimi-k2-v1.vercel.app/', true),
('Connect Four', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_26AM-233x300.png', 'https://connect-four.vercel.app/', true),
('Spot the Difference', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-29-2025-11_16AM-233x300.png', 'https://spot-the-difference.vercel.app/', true),
('Whack a Mole', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-9_37PM-233x300.png', 'https://whack-a-mole.vercel.app/', true),
('Memory Card Game', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_29PM-300x282.png', 'https://memory-card-game-nu-ecru.vercel.app/', true),
('Dots and Boxes', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_21PM-300x219.png', 'https://dots-and-boxes-game-two.vercel.app/', true),
('Words Finding Puzzle', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_19PM-300x282.png', 'https://words-finding-puzzle-game-new.vercel.app/', true),
('Crossword Puzzle', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_15PM-300x233.png', 'https://crossword-puzzle-game-five.vercel.app/', true),
('Number Link Puzzle', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-5_12PM-300x300.png', 'https://number-link-puzzle.vercel.app/', true),
('Maze Game', 'https://applaa.com/wp-content/uploads/2025/09/maze-1.jpg', 'https://maze-game.vercel.app/', true),
('Breakout Arkanoid', 'https://applaa.com/wp-content/uploads/2025/09/Generated-Image-September-27-2025-9_47PM-233x300.png', 'https://breakout-arkanoid.vercel.app/', true),
('Tik Tok Toe', 'https://applaa.com/wp-content/uploads/2025/09/maze.jpg', 'https://applaa.com/tik-tok-toe/', true),
('Sliding Puzzle', 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-7-2025-05_22_26-PM-2.png', 'https://applaa.com/sliding-puzzle/', true),
('Scape the Maze', 'https://applaa.com/wp-content/uploads/2025/09/maze-1.jpg', 'https://applaa.com/scape-the-maze/', true),
('Adventure Map', 'https://applaa.com/wp-content/uploads/2025/09/ChatGPT-Image-Sep-7-2025-05_54_31-PM-1024x683.png', 'https://applaa.com/adventure-map/', true)
ON CONFLICT (name) DO NOTHING; -- Don't insert if game already exists

