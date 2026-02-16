
-- Create table for profile change requests
CREATE TABLE public.profile_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- 'full_name', 'email', 'phone', 'password', 'withdrawal_pin'
  new_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create their own change requests"
ON public.profile_change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view their own change requests"
ON public.profile_change_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all change requests"
ON public.profile_change_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
