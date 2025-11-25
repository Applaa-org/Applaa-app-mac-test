-- Add display_order column to game_templates table for custom ordering
-- Lower numbers appear first

ALTER TABLE public.game_templates 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS game_templates_display_order_idx ON public.game_templates(display_order);

-- Update existing templates to have a default order based on created_at
-- This ensures existing templates have an order value
UPDATE public.game_templates
SET display_order = (
  SELECT COUNT(*) 
  FROM public.game_templates t2 
  WHERE t2.app_type = game_templates.app_type 
  AND t2.created_at >= game_templates.created_at
)
WHERE display_order = 0;

