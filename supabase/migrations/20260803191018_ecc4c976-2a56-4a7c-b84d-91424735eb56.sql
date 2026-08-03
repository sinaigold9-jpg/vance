-- 1) profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cashback_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cashback_earned numeric NOT NULL DEFAULT 0;

-- 2) badges
CREATE TABLE public.cashback_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#D4AF37',
  icon text NOT NULL DEFAULT 'star',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cashback_badges TO anon, authenticated;
GRANT ALL ON public.cashback_badges TO service_role;
ALTER TABLE public.cashback_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_badges_read" ON public.cashback_badges FOR SELECT USING (true);
CREATE POLICY "cashback_badges_admin" ON public.cashback_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) tiers
CREATE TABLE public.cashback_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  min_amount numeric NOT NULL DEFAULT 0,
  max_amount numeric,
  percentage numeric NOT NULL DEFAULT 0,
  badge_id uuid REFERENCES public.cashback_badges(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cashback_tiers TO anon, authenticated;
GRANT ALL ON public.cashback_tiers TO service_role;
ALTER TABLE public.cashback_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_tiers_read" ON public.cashback_tiers FOR SELECT USING (true);
CREATE POLICY "cashback_tiers_admin" ON public.cashback_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) special offers
CREATE TABLE public.cashback_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  color text NOT NULL DEFAULT '#D4AF37',
  percentage numeric NOT NULL DEFAULT 0,
  min_amount numeric NOT NULL DEFAULT 0,
  max_amount numeric,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cashback_offers TO anon, authenticated;
GRANT ALL ON public.cashback_offers TO service_role;
ALTER TABLE public.cashback_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_offers_read" ON public.cashback_offers FOR SELECT USING (true);
CREATE POLICY "cashback_offers_admin" ON public.cashback_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) cashback ledger
CREATE TABLE public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'earn',
  base_amount numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  tier_id uuid REFERENCES public.cashback_tiers(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.cashback_offers(id) ON DELETE SET NULL,
  title text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cashback_tx_unique_source ON public.cashback_transactions(source_transaction_id) WHERE source_transaction_id IS NOT NULL AND kind = 'earn';
CREATE INDEX cashback_tx_user_idx ON public.cashback_transactions(user_id, created_at DESC);
GRANT SELECT ON public.cashback_transactions TO authenticated;
GRANT ALL ON public.cashback_transactions TO service_role;
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_tx_own_read" ON public.cashback_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cashback_tx_admin_all" ON public.cashback_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) updated_at triggers
CREATE TRIGGER trg_cashback_badges_updated BEFORE UPDATE ON public.cashback_badges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cashback_tiers_updated BEFORE UPDATE ON public.cashback_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cashback_offers_updated BEFORE UPDATE ON public.cashback_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) award cashback when a deposit is approved
CREATE OR REPLACE FUNCTION public.award_cashback_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer record;
  v_tier record;
  v_pct numeric := 0;
  v_amount numeric := 0;
  v_title text;
  v_tier_id uuid;
  v_offer_id uuid;
BEGIN
  IF NEW.type <> 'deposit' OR NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.cashback_transactions WHERE source_transaction_id = NEW.id AND kind = 'earn') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_offer FROM public.cashback_offers
   WHERE is_active = true
     AND now() BETWEEN starts_at AND ends_at
     AND NEW.amount >= min_amount
     AND (max_amount IS NULL OR NEW.amount <= max_amount)
   ORDER BY percentage DESC LIMIT 1;

  SELECT * INTO v_tier FROM public.cashback_tiers
   WHERE is_active = true
     AND NEW.amount >= min_amount
     AND (max_amount IS NULL OR NEW.amount <= max_amount)
   ORDER BY percentage DESC LIMIT 1;

  IF v_offer.id IS NOT NULL AND COALESCE(v_offer.percentage,0) >= COALESCE(v_tier.percentage,0) THEN
    v_pct := v_offer.percentage; v_title := v_offer.title; v_offer_id := v_offer.id;
  ELSIF v_tier.id IS NOT NULL THEN
    v_pct := v_tier.percentage; v_title := v_tier.title; v_tier_id := v_tier.id;
  ELSE
    RETURN NEW;
  END IF;

  v_amount := round(NEW.amount * v_pct / 100.0, 2);
  IF v_amount <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.cashback_transactions (user_id, source_transaction_id, kind, base_amount, percentage, amount, tier_id, offer_id, title)
  VALUES (NEW.user_id, NEW.id, 'earn', NEW.amount, v_pct, v_amount, v_tier_id, v_offer_id, v_title);

  UPDATE public.profiles
     SET cashback_balance = COALESCE(cashback_balance,0) + v_amount,
         total_cashback_earned = COALESCE(total_cashback_earned,0) + v_amount
   WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.user_id, 'كاش باك جديد 🎉',
    'حصلت على ' || v_amount || ' جنيه كاش باك (' || v_pct || '%) على شحن ' || NEW.amount || ' جنيه.', 'cashback');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_cashback_on_deposit
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.award_cashback_on_deposit();

-- 8) spend cashback (packages only)
CREATE OR REPLACE FUNCTION public.spend_cashback(_amount numeric, _note text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bal numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  SELECT COALESCE(cashback_balance,0) INTO v_bal FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_bal < _amount THEN RAISE EXCEPTION 'insufficient cashback balance'; END IF;

  UPDATE public.profiles SET cashback_balance = v_bal - _amount WHERE id = v_user;

  INSERT INTO public.cashback_transactions (user_id, kind, amount, title, note)
  VALUES (v_user, 'spend', -_amount, 'استخدام الكاش باك في شراء باقة', _note);

  RETURN v_bal - _amount;
END;
$$;

-- 9) default tiers
INSERT INTO public.cashback_tiers (title, description, min_amount, max_amount, percentage) VALUES
  ('شريحة البداية', 'شحن من 50 إلى 249 جنيه', 50, 249, 5),
  ('شريحة الفضية', 'شحن من 250 إلى 499 جنيه', 250, 499, 8),
  ('شريحة الذهبية', 'شحن من 500 إلى 999 جنيه', 500, 999, 10),
  ('شريحة البلاتينية', 'شحن من 1000 إلى 1999 جنيه', 1000, 1999, 15),
  ('شريحة الماسية', 'شحن من 2000 إلى 4999 جنيه', 2000, 4999, 20),
  ('شريحة النخبة', 'شحن من 5000 إلى 9999 جنيه', 5000, 9999, 25),
  ('شريحة VIP القصوى', 'شحن 10000 جنيه فأكثر', 10000, NULL, 30);