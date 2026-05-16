
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  version_code integer NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  images text[] NOT NULL DEFAULT '{}'::text[],
  is_mandatory boolean NOT NULL DEFAULT true,
  target_audience text NOT NULL DEFAULT 'all',
  theme text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  release_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active versions"
ON public.app_versions FOR SELECT
USING (auth.uid() IS NOT NULL AND (is_active = true OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can manage versions"
ON public.app_versions FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_versions_updated_at
BEFORE UPDATE ON public.app_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_app_versions_code ON public.app_versions(version_code);

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_versions;

INSERT INTO storage.buckets (id, name, public) VALUES ('version-images', 'version-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view version images"
ON storage.objects FOR SELECT
USING (bucket_id = 'version-images');

CREATE POLICY "Admins can upload version images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'version-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update version images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'version-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete version images"
ON storage.objects FOR DELETE
USING (bucket_id = 'version-images' AND has_role(auth.uid(), 'admin'));

-- Seed initial version 1.0.0 so the table is not empty
INSERT INTO public.app_versions (version, version_code, title, description, features, is_mandatory, target_audience, theme)
VALUES (
  '1.0.0', 100,
  'الإصدار الأولي',
  'إطلاق تطبيق Advance',
  '[{"label":"إطلاق التطبيق","badge":"new","description":"النسخة الأولى من تطبيق Advance","icon":"sparkles"}]'::jsonb,
  false, 'all', 'default'
);
