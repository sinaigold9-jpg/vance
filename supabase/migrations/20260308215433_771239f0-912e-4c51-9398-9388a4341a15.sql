
ALTER TABLE public.offers_contests 
ADD COLUMN IF NOT EXISTS button_label text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0;
