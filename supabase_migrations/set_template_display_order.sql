-- Set display order for specific templates to appear at the top
-- Lower numbers appear first (0, 1, 2, etc.)

-- Set order for Snake Game, Typing Invader, and Fruit Catcher to appear first
UPDATE public.game_templates
SET display_order = 1
WHERE name = 'Snake Game' AND app_type = 'godot';

UPDATE public.game_templates
SET display_order = 2
WHERE name = 'Typing Invader' AND app_type = 'godot';

UPDATE public.game_templates
SET display_order = 3
WHERE name = 'Fruit Catcher' AND app_type = 'godot';

-- Note: You can adjust these numbers to change the order
-- Lower numbers = appear first
-- You can also update other templates' display_order as needed

