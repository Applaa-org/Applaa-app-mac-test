-- Test script to verify game_templates table setup
-- Run this after seed_game_templates.sql to verify everything works

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'game_templates'
) AS table_exists;

-- Count templates by app type
SELECT app_type, COUNT(*) AS template_count 
FROM public.game_templates 
GROUP BY app_type
ORDER BY app_type;

-- Count total templates
SELECT COUNT(*) AS total_templates FROM public.game_templates;

-- List first 10 Godot templates (to verify data)
SELECT 
  id, 
  name, 
  emoji,
  app_type,
  is_default,
  CASE 
    WHEN preview_url IS NOT NULL THEN 'Yes' 
    ELSE 'No' 
  END AS has_preview_url,
  LENGTH(details) AS details_length,
  created_at 
FROM public.game_templates 
WHERE app_type = 'godot'
ORDER BY created_at DESC
LIMIT 10;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'game_templates';

-- Verify unique constraint works (should return 0 if no duplicates)
SELECT name, app_type, COUNT(*) as count
FROM public.game_templates
GROUP BY name, app_type
HAVING COUNT(*) > 1;

