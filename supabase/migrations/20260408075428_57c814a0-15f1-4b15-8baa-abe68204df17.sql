
-- Add is_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Add unique constraint on telegram_chat_id to prevent duplicate telegram accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id_unique 
ON public.profiles (telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;
