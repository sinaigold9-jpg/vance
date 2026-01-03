
-- Remove the unique constraint on valid_date as multiple codes can have the same valid_date
ALTER TABLE public.daily_codes DROP CONSTRAINT IF EXISTS daily_codes_valid_date_key;
