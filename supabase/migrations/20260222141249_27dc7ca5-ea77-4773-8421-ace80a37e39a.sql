
-- Add last_active_at to profiles for real activity tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Create email subscriptions table
CREATE TABLE public.email_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create admin messages table for sending emails/messages
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'all', -- 'all', 'individual', 'subscribers'
  recipient_user_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS for email_subscriptions
CREATE POLICY "Users can insert their own subscription"
ON public.email_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscription"
ON public.email_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.email_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for admin_messages
CREATE POLICY "Admins can manage all messages"
ON public.admin_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view messages sent to them"
ON public.admin_messages FOR SELECT
USING (auth.uid() = recipient_user_id OR recipient_type = 'all' OR recipient_type = 'subscribers');

-- Enable realtime for email_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
