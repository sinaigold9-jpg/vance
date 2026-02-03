CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_uuid uuid;
BEGIN
  -- Defensive parsing: referral must NEVER block signup
  ref_uuid := NULL;
  BEGIN
    IF NEW.raw_user_meta_data ->> 'referred_by' IS NOT NULL
       AND NEW.raw_user_meta_data ->> 'referred_by' != '' THEN
      ref_uuid := (NEW.raw_user_meta_data ->> 'referred_by')::uuid;
    END IF;
  EXCEPTION WHEN others THEN
    ref_uuid := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    referral_code,
    referred_by,
    team_code,
    balance,
    membership_id,
    is_package_activated,
    trial_end_date
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8),
    ref_uuid,
    CASE WHEN ref_uuid IS NOT NULL THEN ref_uuid::text ELSE NULL END,
    50, -- New users start with 50 EGP
    public.generate_membership_id(), -- Generate unique membership ID
    true, -- Package activated for trial
    (CURRENT_DATE + INTERVAL '7 days')::date -- 7 day trial period
  );

  -- Add default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Add admin role for specific email
  IF NEW.email = 'sinaigold9@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  -- Give referrer 5 EGP bonus if referral code was used
  IF ref_uuid IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = balance + 5,
        total_earnings = total_earnings + 5,
        team_members_count = COALESCE(team_members_count, 0) + 1
    WHERE id = ref_uuid;

    -- Log referral bonus
    INSERT INTO public.activity_logs (user_id, action, amount)
    VALUES (
      ref_uuid,
      'مكافأة إحالة مستخدم جديد',
      5
    );
  END IF;

  RETURN NEW;
END;
$function$;