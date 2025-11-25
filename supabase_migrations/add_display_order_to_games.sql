-- Add display_order column to games table for custom ordering
-- Lower numbers appear first, higher numbers appear later
-- New games will be added to the last position by default

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS games_display_order_idx ON public.games(display_order);

-- Set initial display_order for existing games based on created_at
-- Older games get lower numbers (appear first), newer games get higher numbers
UPDATE public.games
SET display_order = (
  SELECT COUNT(*) 
  FROM public.games g2 
  WHERE g2.created_at <= games.created_at
)
WHERE display_order = 0;

