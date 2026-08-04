
CREATE TABLE public.account_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  quality_score numeric NOT NULL DEFAULT 0,
  liveness_score numeric NOT NULL DEFAULT 0,
  face_signature text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  retry_allowed boolean NOT NULL DEFAULT false,
  duplicate_flag boolean NOT NULL DEFAULT false,
  duplicate_of uuid,
  reward_granted boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_verifications_active_uniq
  ON public.account_verifications (user_id)
  WHERE status IN ('pending','approved');

CREATE INDEX account_verifications_status_idx ON public.account_verifications (status, created_at DESC);
CREATE INDEX account_verifications_signature_idx ON public.account_verifications (face_signature);

GRANT SELECT, INSERT ON public.account_verifications TO authenticated;
GRANT ALL ON public.account_verifications TO service_role;

ALTER TABLE public.account_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification"
  ON public.account_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification"
  ON public.account_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins update verifications"
  ON public.account_verifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete verifications"
  ON public.account_verifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_account_verifications_updated_at
  BEFORE UPDATE ON public.account_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_reward_claimed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.review_account_verification(
  _request_id uuid,
  _decision text,
  _reason text DEFAULT NULL,
  _allow_retry boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  already_claimed boolean;
  dup_count int := 0;
  reward numeric := 50;
  granted boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT * INTO r FROM public.account_verifications WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request already reviewed'; END IF;

  IF _decision = 'approved' THEN
    IF r.face_signature IS NOT NULL THEN
      SELECT count(*) INTO dup_count
        FROM public.account_verifications v
       WHERE v.face_signature = r.face_signature
         AND v.user_id <> r.user_id
         AND v.status = 'approved';
    END IF;

    SELECT COALESCE(verification_reward_claimed, false) INTO already_claimed
      FROM public.profiles WHERE id = r.user_id;

    IF dup_count = 0 AND NOT already_claimed THEN
      granted := true;
      UPDATE public.profiles
         SET cashback_balance = COALESCE(cashback_balance,0) + reward,
             total_cashback_earned = COALESCE(total_cashback_earned,0) + reward,
             verification_reward_claimed = true,
             is_verified = true,
             verified_at = now()
       WHERE id = r.user_id;

      INSERT INTO public.cashback_transactions (user_id, kind, base_amount, percentage, amount, title, note)
      VALUES (r.user_id, 'earn', 0, 0, reward, 'مكافأة توثيق الحساب', 'مكافأة لمرة واحدة بعد اعتماد توثيق الحساب');
    ELSE
      UPDATE public.profiles
         SET is_verified = true, verified_at = now()
       WHERE id = r.user_id;
    END IF;

    UPDATE public.account_verifications
       SET status = 'approved', reward_granted = granted,
           duplicate_flag = (dup_count > 0),
           reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = NULL
     WHERE id = _request_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (r.user_id, 'تم توثيق حسابك ✅',
      CASE WHEN granted THEN 'تهانينا! تم توثيق حسابك وإضافة 50 جنيه كاش باك إلى محفظتك.'
           ELSE 'تم توثيق حسابك بنجاح.' END, 'verification');

  ELSIF _decision = 'rejected' THEN
    UPDATE public.account_verifications
       SET status = 'rejected', rejection_reason = _reason,
           retry_allowed = COALESCE(_allow_retry, false),
           reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = _request_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (r.user_id, 'طلب توثيق الحساب مرفوض',
      COALESCE(_reason, 'لم يتم قبول طلب التوثيق.') ||
      CASE WHEN COALESCE(_allow_retry,false) THEN ' يمكنك إعادة المحاولة.' ELSE '' END, 'verification');
  ELSE
    RAISE EXCEPTION 'invalid decision';
  END IF;

  RETURN jsonb_build_object('success', true, 'reward_granted', granted, 'duplicate', dup_count > 0);
END;
$$;
