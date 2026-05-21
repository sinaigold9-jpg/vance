
ALTER TABLE public.app_versions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS size_bytes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS build_hash text,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Ensure existing rows stay visible
UPDATE public.app_versions SET status = 'published' WHERE status IS NULL OR status = '';
UPDATE public.app_versions SET published_at = COALESCE(published_at, release_date, created_at) WHERE published_at IS NULL;

-- Index for fast hash lookup
CREATE INDEX IF NOT EXISTS idx_app_versions_build_hash ON public.app_versions(build_hash);
CREATE INDEX IF NOT EXISTS idx_app_versions_status ON public.app_versions(status);
