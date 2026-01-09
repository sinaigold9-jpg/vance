
-- Add transaction_number column for 14-digit unique transaction ID
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS transaction_number TEXT UNIQUE;

-- Create function to generate 14-digit unique transaction number
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  number_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 14-digit number
    new_number := lpad(floor(random() * 100000000000000)::text, 14, '0');
    
    -- Check if this number already exists
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE transaction_number = new_number) INTO number_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT number_exists;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Create trigger to auto-generate transaction number
CREATE OR REPLACE FUNCTION public.set_transaction_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := public.generate_transaction_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transaction_number_trigger ON public.transactions;
CREATE TRIGGER transaction_number_trigger
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_transaction_number();

-- Update existing transactions with unique numbers
UPDATE public.transactions 
SET transaction_number = public.generate_transaction_number()
WHERE transaction_number IS NULL;

-- Add referral link support - add referred_by column to track who referred who
-- Update profiles to support referral link system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS team_rank TEXT DEFAULT 'member';

-- Add team earnings tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS team_members_count INTEGER DEFAULT 0;

-- Add app_settings entries for feature toggles if they don't exist
INSERT INTO public.app_settings (key, value, is_active)
VALUES 
  ('app_enabled', 'true', true),
  ('app_disabled_message', 'شكراً لوصولك إلى التطبيق، التطبيق حالياً تحت التحديث', true),
  ('tasks_enabled', 'true', true),
  ('tasks_disabled_message', 'نظام المهام متوقف مؤقتاً', true),
  ('lucky_wheel_enabled', 'true', true),
  ('lucky_wheel_disabled_message', 'عجلة الحظ متوقفة مؤقتاً', true),
  ('referral_enabled', 'true', true),
  ('referral_disabled_message', 'نظام الإحالة متوقف مؤقتاً', true),
  ('team_enabled', 'true', true),
  ('team_disabled_message', 'نظام الفريق متوقف مؤقتاً', true)
ON CONFLICT (key) DO NOTHING;
