-- Add display_location column to promotions
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS display_location text NOT NULL DEFAULT 'home_only';
-- Values: 'home_only', 'offers_only', 'both'