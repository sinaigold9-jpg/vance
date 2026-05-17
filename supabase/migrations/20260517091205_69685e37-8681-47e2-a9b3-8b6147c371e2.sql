ALTER TABLE public.app_versions
  ADD COLUMN IF NOT EXISTS update_label TEXT;