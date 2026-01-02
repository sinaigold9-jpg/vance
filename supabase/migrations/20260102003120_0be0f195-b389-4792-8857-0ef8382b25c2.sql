
-- 1. Make is_active NOT NULL with DEFAULT true
ALTER TABLE public.daily_codes 
ALTER COLUMN is_active SET NOT NULL,
ALTER COLUMN is_active SET DEFAULT true;

-- 2. Add UNIQUE constraint on code to prevent duplicates
ALTER TABLE public.daily_codes 
ADD CONSTRAINT daily_codes_code_unique UNIQUE (code);
