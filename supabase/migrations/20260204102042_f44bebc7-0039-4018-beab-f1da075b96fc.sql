-- 1. Add link column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- 2. Add points column to profiles table  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 3. Create promotions table for admin-managed offers
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_style JSONB DEFAULT '{}',
  image_url TEXT,
  link_url TEXT,
  link_type TEXT DEFAULT 'internal',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active promotions
CREATE POLICY "Anyone can view active promotions"
  ON public.promotions FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can manage all promotions
CREATE POLICY "Admins can manage promotions"
  ON public.promotions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for promotions
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;

-- Create trigger for updated_at on promotions
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();