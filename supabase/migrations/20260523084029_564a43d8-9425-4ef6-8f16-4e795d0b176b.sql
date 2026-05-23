
ALTER TABLE public.contest_progress
  ADD COLUMN IF NOT EXISTS last_completed_cairo_date date;

CREATE TABLE IF NOT EXISTS public.update_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  video_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.update_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active updates"
  ON public.update_posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active = true OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can manage updates"
  ON public.update_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_update_posts_updated_at
  BEFORE UPDATE ON public.update_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
