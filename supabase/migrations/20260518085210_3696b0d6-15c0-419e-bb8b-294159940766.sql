
-- Contests
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  banner_url text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  target_audience text NOT NULL DEFAULT 'all_vip',
  total_levels int NOT NULL DEFAULT 20,
  questions_per_level int NOT NULL DEFAULT 5,
  surprise_every int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  show_on_home boolean NOT NULL DEFAULT true,
  show_on_offers boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contests" ON public.contests FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view active contests" ON public.contests FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active OR has_role(auth.uid(),'admin')));

-- Questions
CREATE TABLE public.contest_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  level_number int NOT NULL,
  order_in_level int NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  wrong_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contest_questions ON public.contest_questions(contest_id, level_number, order_in_level);
ALTER TABLE public.contest_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage questions" ON public.contest_questions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view questions of active contests" ON public.contest_questions FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.contests c WHERE c.id = contest_id AND c.is_active)
);

-- Rewards
CREATE TABLE public.contest_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  at_level int NOT NULL,
  reward_type text NOT NULL,
  reward_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  title text NOT NULL,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contest_id, at_level)
);
ALTER TABLE public.contest_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rewards" ON public.contest_rewards FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view rewards" ON public.contest_rewards FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.contests c WHERE c.id = contest_id AND c.is_active)
);

-- Progress
CREATE TABLE public.contest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_level int NOT NULL DEFAULT 1,
  completed_levels int[] NOT NULL DEFAULT '{}',
  current_question_index int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  wrong_count int NOT NULL DEFAULT 0,
  claimed_rewards int[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_played_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE(contest_id, user_id)
);
ALTER TABLE public.contest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.contest_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all progress" ON public.contest_progress FOR SELECT USING (has_role(auth.uid(),'admin'));

-- Answers log
CREATE TABLE public.contest_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.contest_questions(id) ON DELETE CASCADE,
  selected_index int NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contest_answers ON public.contest_answers(contest_id, user_id);
ALTER TABLE public.contest_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own answers" ON public.contest_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own answers" ON public.contest_answers FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temp_vip_type text,
  ADD COLUMN IF NOT EXISTS temp_vip_until timestamptz,
  ADD COLUMN IF NOT EXISTS contest_discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contest_discount_until timestamptz;

-- Updated_at trigger
CREATE TRIGGER trg_contests_updated BEFORE UPDATE ON public.contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Claim reward RPC
CREATE OR REPLACE FUNCTION public.claim_contest_reward(_contest_id uuid, _level int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _reward record;
  _prog record;
  _val jsonb;
  _amount numeric;
  _points int;
  _percent numeric;
  _days int;
  _to_vip text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO _prog FROM contest_progress WHERE contest_id = _contest_id AND user_id = _user;
  IF NOT FOUND THEN RAISE EXCEPTION 'no progress'; END IF;
  IF _level = ANY(_prog.claimed_rewards) THEN RAISE EXCEPTION 'already claimed'; END IF;
  IF NOT (_level = ANY(_prog.completed_levels)) THEN RAISE EXCEPTION 'level not completed'; END IF;

  SELECT * INTO _reward FROM contest_rewards WHERE contest_id = _contest_id AND at_level = _level;
  IF NOT FOUND THEN RAISE EXCEPTION 'no reward'; END IF;

  _val := _reward.reward_value;

  IF _reward.reward_type = 'balance' THEN
    _amount := COALESCE((_val->>'amount')::numeric, 0);
    UPDATE profiles SET balance = balance + _amount, total_earnings = total_earnings + _amount WHERE id = _user;
  ELSIF _reward.reward_type = 'points' THEN
    _points := COALESCE((_val->>'points')::int, 0);
    UPDATE profiles SET points = COALESCE(points,0) + _points WHERE id = _user;
  ELSIF _reward.reward_type = 'discount_percent' THEN
    _percent := COALESCE((_val->>'percent')::numeric, 0);
    _days := COALESCE((_val->>'days')::int, 7);
    UPDATE profiles SET contest_discount_percent = _percent, contest_discount_until = now() + (_days || ' days')::interval WHERE id = _user;
  ELSIF _reward.reward_type = 'vip_upgrade_temp' THEN
    _to_vip := _val->>'to';
    _days := COALESCE((_val->>'days')::int, 7);
    UPDATE profiles SET temp_vip_type = _to_vip, temp_vip_until = now() + (_days || ' days')::interval WHERE id = _user;
  END IF;

  UPDATE contest_progress
    SET claimed_rewards = array_append(claimed_rewards, _level),
        last_played_at = now()
    WHERE contest_id = _contest_id AND user_id = _user;

  INSERT INTO activity_logs (user_id, action, amount, details)
  VALUES (_user, 'مكافأة مسابقة - مستوى ' || _level, COALESCE(_amount,0),
    jsonb_build_object('contest_id', _contest_id, 'level', _level, 'reward_type', _reward.reward_type, 'reward_value', _val));

  RETURN jsonb_build_object('success', true, 'reward_type', _reward.reward_type, 'reward_value', _val, 'title', _reward.title);
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_progress;
