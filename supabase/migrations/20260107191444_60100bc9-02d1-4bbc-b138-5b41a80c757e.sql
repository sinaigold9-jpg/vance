-- Add withdrawal PIN column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS withdrawal_pin TEXT DEFAULT NULL;

-- Add trial end date column to profiles table for 7-day free trial
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT NULL;

-- Add wallet holder name column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS wallet_holder_name TEXT DEFAULT NULL;

-- Add wallet number column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS wallet_number TEXT DEFAULT NULL;

-- Add receipt URL column to package upgrade requests table
ALTER TABLE public.package_upgrade_requests
ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL;

-- Add amount column to package upgrade requests table
ALTER TABLE public.package_upgrade_requests
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT NULL;

-- Update handle_new_user function to set trial_end_date
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, referral_code, referred_by, balance, membership_id, is_package_activated, trial_end_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'referred_by' IS NOT NULL 
        AND NEW.raw_user_meta_data ->> 'referred_by' != '' 
      THEN (NEW.raw_user_meta_data ->> 'referred_by')::uuid 
      ELSE NULL 
    END,
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
  IF NEW.raw_user_meta_data ->> 'referred_by' IS NOT NULL 
     AND NEW.raw_user_meta_data ->> 'referred_by' != '' THEN
    UPDATE public.profiles 
    SET balance = balance + 5,
        total_earnings = total_earnings + 5
    WHERE id = (NEW.raw_user_meta_data ->> 'referred_by')::uuid;
    
    -- Log referral bonus
    INSERT INTO public.activity_logs (user_id, action, amount)
    VALUES (
      (NEW.raw_user_meta_data ->> 'referred_by')::uuid,
      'مكافأة إحالة مستخدم جديد',
      5
    );
  END IF;
  
  RETURN NEW;
END;
$$;