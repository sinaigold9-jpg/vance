
-- OTP codes table
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OTP codes"
ON public.otp_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert OTP codes"
ON public.otp_codes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update OTP codes"
ON public.otp_codes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all OTP codes"
ON public.otp_codes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add telegram_chat_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;

-- Telegram bot state for polling
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for bot state"
ON public.telegram_bot_state FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast OTP lookup
CREATE INDEX idx_otp_codes_user_purpose ON public.otp_codes (user_id, purpose, is_used, expires_at);
CREATE INDEX idx_profiles_telegram_chat ON public.profiles (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
