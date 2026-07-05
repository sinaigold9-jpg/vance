CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('push', 'telegram', 'mixed', 'diagnostic', 'test')),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text,
  message text,
  target_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  expired_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'skipped')),
  error_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_delivery_logs TO authenticated;
GRANT ALL ON public.notification_delivery_logs TO service_role;

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view notification delivery logs" ON public.notification_delivery_logs;
CREATE POLICY "Admins can view notification delivery logs"
ON public.notification_delivery_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_created_at ON public.notification_delivery_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_channel ON public.notification_delivery_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status ON public.notification_delivery_logs(status);

CREATE TABLE IF NOT EXISTS public.app_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('client', 'backend', 'security', 'notification')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT SELECT, UPDATE ON public.app_error_reports TO authenticated;
GRANT ALL ON public.app_error_reports TO service_role;

ALTER TABLE public.app_error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view app error reports" ON public.app_error_reports;
CREATE POLICY "Admins can view app error reports"
ON public.app_error_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update app error reports" ON public.app_error_reports;
CREATE POLICY "Admins can update app error reports"
ON public.app_error_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_app_error_reports_created_at ON public.app_error_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_reports_status ON public.app_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_app_error_reports_source ON public.app_error_reports(source);
CREATE INDEX IF NOT EXISTS idx_app_error_reports_severity ON public.app_error_reports(severity);

DROP TRIGGER IF EXISTS update_app_error_reports_updated_at ON public.app_error_reports;
CREATE TRIGGER update_app_error_reports_updated_at
BEFORE UPDATE ON public.app_error_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();