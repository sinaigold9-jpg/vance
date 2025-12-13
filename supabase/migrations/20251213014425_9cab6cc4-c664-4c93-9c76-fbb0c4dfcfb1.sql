-- Update handle_new_user function to include referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, referral_code, referred_by)
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
    END
  );
  
  -- Add default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;