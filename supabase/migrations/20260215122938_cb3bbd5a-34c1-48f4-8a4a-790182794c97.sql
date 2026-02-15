
-- Table for temporary export access keys
CREATE TABLE public.export_access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_ip text,
  is_revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz
);

-- Enable RLS
ALTER TABLE public.export_access_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage export keys
CREATE POLICY "Admins can manage export keys"
  ON public.export_access_keys
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Export usage logs
CREATE TABLE public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid REFERENCES public.export_access_keys(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view export logs"
  ON public.export_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));
