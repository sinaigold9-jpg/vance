-- Add daily attempts tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_attempts_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_date date NULL;