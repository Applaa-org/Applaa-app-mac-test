-- Add show_in_hub column to user_apps table
ALTER TABLE public.user_apps 
ADD COLUMN IF NOT EXISTS show_in_hub BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS user_apps_show_in_hub_idx 
ON public.user_apps(show_in_hub) 
WHERE show_in_hub = true;

