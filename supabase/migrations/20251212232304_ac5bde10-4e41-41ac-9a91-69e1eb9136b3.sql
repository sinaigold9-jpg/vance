-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('beginner', 'vip1', 'vip2', 'vip3');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'task_earning', 'referral_earning', 'share_earning', 'wheel_earning', 'team_earning');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for payment gateway
CREATE TYPE public.payment_gateway AS ENUM ('vodafone', 'etisalat', 'orange', 'we');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  account_type account_type NOT NULL DEFAULT 'beginner',
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  team_code TEXT UNIQUE,
  lucky_wheel_used BOOLEAN NOT NULL DEFAULT false,
  last_wheel_spin TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  account_type account_type NOT NULL,
  task_reward DECIMAL(10,2) NOT NULL,
  daily_tasks INTEGER NOT NULL DEFAULT 3,
  daily_earnings DECIMAL(10,2) NOT NULL,
  min_withdrawal DECIMAL(10,2) NOT NULL,
  has_daily_wheel BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  payment_gateway payment_gateway,
  phone_number TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_tasks table
CREATE TABLE public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_number INTEGER NOT NULL CHECK (task_number >= 1 AND task_number <= 3),
  completed BOOLEAN NOT NULL DEFAULT false,
  earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, task_number, task_date)
);

-- Create daily_codes table (admin sets the daily code)
CREATE TABLE public.daily_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  valid_date DATE NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_logs table for admin dashboard
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create package_upgrade_requests table
CREATE TABLE public.package_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  current_package account_type NOT NULL,
  requested_package account_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for packages (public read)
CREATE POLICY "Anyone can view active packages" ON public.packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage packages" ON public.packages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_tasks
CREATE POLICY "Users can view their own tasks" ON public.daily_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tasks" ON public.daily_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks" ON public.daily_tasks
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_codes
CREATE POLICY "Authenticated users can view today's code" ON public.daily_codes
  FOR SELECT USING (auth.uid() IS NOT NULL AND valid_date = CURRENT_DATE);

CREATE POLICY "Admins can manage codes" ON public.daily_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON public.activity_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for package_upgrade_requests
CREATE POLICY "Users can view their own requests" ON public.package_upgrade_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" ON public.package_upgrade_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.package_upgrade_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8)
  );
  
  -- Add default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles timestamp update
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default packages
INSERT INTO public.packages (name, price, account_type, task_reward, daily_tasks, daily_earnings, min_withdrawal, has_daily_wheel)
VALUES 
  ('المبتدئين', 100, 'beginner', 3, 3, 9, 500, false),
  ('VIP1', 500, 'vip1', 15, 3, 45, 1000, true),
  ('VIP2', 850, 'vip2', 25, 3, 75, 1500, true),
  ('VIP3', 1500, 'vip3', 35, 3, 105, 2000, true);