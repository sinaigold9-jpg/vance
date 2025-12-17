
-- Add membership_id column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_id text UNIQUE;

-- Add is_package_activated column (true when balance reaches 100 for beginners)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_package_activated boolean DEFAULT false;

-- Function to generate 9-digit membership ID starting with 6
CREATE OR REPLACE FUNCTION public.generate_membership_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    -- Generate 9-digit number starting with 6
    new_id := '6' || lpad(floor(random() * 100000000)::text, 8, '0');
    
    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE membership_id = new_id) INTO id_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Update handle_new_user function to include membership_id and set balance to 50
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, referral_code, referred_by, balance, membership_id, is_package_activated)
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
    false -- Package not activated until they reach 100 EGP
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

-- Generate membership IDs for existing users who don't have one
UPDATE public.profiles 
SET membership_id = public.generate_membership_id()
WHERE membership_id IS NULL;
