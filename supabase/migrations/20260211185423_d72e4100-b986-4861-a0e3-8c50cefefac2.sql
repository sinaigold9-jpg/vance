
-- Download counter table
CREATE TABLE public.download_counter (
  id text PRIMARY KEY DEFAULT 'main',
  count integer NOT NULL DEFAULT 7328,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  daily_increment_used integer NOT NULL DEFAULT 0,
  last_increment_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.download_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read download counter" ON public.download_counter FOR SELECT USING (true);
CREATE POLICY "Anyone can update download counter" ON public.download_counter FOR UPDATE USING (true);

INSERT INTO public.download_counter (id, count, last_updated_at, daily_increment_used, last_increment_date)
VALUES ('main', 7328, now(), 0, CURRENT_DATE);

-- Add offer_type and buttons columns to promotions
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS offer_type text DEFAULT 'personal';
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS buttons jsonb DEFAULT '[]'::jsonb;

-- Enable realtime for download counter
ALTER PUBLICATION supabase_realtime ADD TABLE public.download_counter;
