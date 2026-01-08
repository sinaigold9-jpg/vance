-- Add app_settings table for bot configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app settings
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active settings
CREATE POLICY "Users can view active settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Insert default bot settings
INSERT INTO public.app_settings (key, value, is_active)
VALUES ('bot_code', '', false)
ON CONFLICT (key) DO NOTHING;

-- Add realtime for app_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;