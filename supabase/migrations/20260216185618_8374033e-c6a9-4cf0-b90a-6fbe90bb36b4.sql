
-- Fix 1: Secure receipts storage bucket - require authentication for uploads
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid() IS NOT NULL
);

-- Add SELECT policy for admins to view receipts
CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow uploaders to view their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Create admin_update_user_balance RPC with validation
CREATE OR REPLACE FUNCTION public.admin_update_user_balance(
  _user_id UUID,
  _new_balance DECIMAL DEFAULT NULL,
  _new_earnings DECIMAL DEFAULT NULL,
  _new_account_type text DEFAULT NULL,
  _new_email text DEFAULT NULL,
  _new_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_balance DECIMAL;
  _old_earnings DECIMAL;
BEGIN
  -- Validate admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Validate balance bounds
  IF _new_balance IS NOT NULL AND (_new_balance < 0 OR _new_balance > 10000000) THEN
    RAISE EXCEPTION 'Invalid balance: must be between 0 and 10,000,000';
  END IF;

  IF _new_earnings IS NOT NULL AND (_new_earnings < 0 OR _new_earnings > 10000000) THEN
    RAISE EXCEPTION 'Invalid earnings: must be between 0 and 10,000,000';
  END IF;

  -- Get old values for audit
  SELECT balance, total_earnings INTO _old_balance, _old_earnings
  FROM profiles WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Log the change with old and new values
  INSERT INTO activity_logs (user_id, action, amount, details)
  VALUES (
    _user_id,
    'تعديل بيانات المستخدم بواسطة الإدارة',
    COALESCE(_new_balance, _old_balance),
    jsonb_build_object(
      'admin_id', auth.uid(),
      'old_balance', _old_balance,
      'new_balance', COALESCE(_new_balance, _old_balance),
      'old_earnings', _old_earnings,
      'new_earnings', COALESCE(_new_earnings, _old_earnings),
      'account_type_change', _new_account_type,
      'email_change', _new_email,
      'phone_change', _new_phone
    )
  );

  -- Update profile
  UPDATE profiles SET
    balance = COALESCE(_new_balance, balance),
    total_earnings = COALESCE(_new_earnings, total_earnings),
    account_type = COALESCE(_new_account_type::account_type, account_type),
    email = COALESCE(_new_email, email),
    phone = COALESCE(_new_phone, phone),
    is_package_activated = CASE
      WHEN _new_account_type IS NOT NULL AND _new_account_type = 'beginner' 
           AND COALESCE(_new_balance, balance) >= 100 THEN true
      WHEN _new_account_type IS NOT NULL THEN true
      ELSE is_package_activated
    END
  WHERE id = _user_id;
END;
$$;
