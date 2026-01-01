-- Add preview_image_url field to user_apps table
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Add index for preview_image_url queries
CREATE INDEX IF NOT EXISTS user_apps_preview_image_url_idx ON public.user_apps(preview_image_url) WHERE preview_image_url IS NOT NULL;

