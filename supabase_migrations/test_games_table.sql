-- Test script to verify games table setup
-- Run this after create_games_table.sql to verify everything works

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'games'
) AS table_exists;

-- Count games
SELECT COUNT(*) AS game_count FROM public.games;

-- List all games
SELECT id, name, image_url, game_url, is_default, created_at 
FROM public.games 
ORDER BY created_at DESC;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'games';

