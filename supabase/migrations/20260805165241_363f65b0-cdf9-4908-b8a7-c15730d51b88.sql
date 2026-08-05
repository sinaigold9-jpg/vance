-- 1) Remove advertisements system
DROP TABLE IF EXISTS public.ad_interaction_replies CASCADE;
DROP TABLE IF EXISTS public.ad_interactions CASCADE;
DROP TABLE IF EXISTS public.ad_clicks CASCADE;
DROP TABLE IF EXISTS public.ad_views CASCADE;
DROP TABLE IF EXISTS public.ad_images CASCADE;
DROP TABLE IF EXISTS public.advertisements CASCADE;
DROP TABLE IF EXISTS public.advertiser_profiles CASCADE;
DROP TYPE IF EXISTS public.ad_category CASCADE;
DROP TYPE IF EXISTS public.ad_status CASCADE;
DROP TYPE IF EXISTS public.ad_type CASCADE;

-- 2) Cashback tiers: future loyalty conditions
ALTER TABLE public.cashback_tiers
  ADD COLUMN IF NOT EXISTS min_total_deposits numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_account_age_days integer NOT NULL DEFAULT 0;

-- 3) App versions: fixes + future notes
ALTER TABLE public.app_versions
  ADD COLUMN IF NOT EXISTS fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS future_notes text;