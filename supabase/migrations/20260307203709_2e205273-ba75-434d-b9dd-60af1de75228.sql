
-- Create offers_contests table
CREATE TABLE public.offers_contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  type TEXT NOT NULL DEFAULT 'offer' CHECK (type IN ('offer', 'contest')),
  reward_type TEXT NOT NULL DEFAULT 'balance' CHECK (reward_type IN ('balance', 'points', 'feature')),
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  required_task TEXT NOT NULL DEFAULT 'share_app' CHECK (required_task IN ('share_app', 'invite_friends', 'share_facebook', 'share_telegram', 'share_whatsapp', 'custom')),
  custom_task_description TEXT,
  display_location TEXT NOT NULL DEFAULT 'offers_only' CHECK (display_location IN ('home_only', 'offers_only', 'both', 'contest_points', 'offers_contests_page')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  display_order INTEGER DEFAULT 0
);

-- Create participations table
CREATE TABLE public.offer_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers_contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  balance_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id, user_id)
);

-- Enable RLS
ALTER TABLE public.offers_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_participations ENABLE ROW LEVEL SECURITY;

-- RLS for offers_contests
CREATE POLICY "Anyone can view active offers" ON public.offers_contests
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage offers" ON public.offers_contests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS for offer_participations
CREATE POLICY "Users can view own participations" ON public.offer_participations
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own participations" ON public.offer_participations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all participations" ON public.offer_participations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own participations" ON public.offer_participations
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers_contests;
