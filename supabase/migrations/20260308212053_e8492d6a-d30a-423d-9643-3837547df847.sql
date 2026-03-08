
-- Create staff_members table
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  role_title text NOT NULL DEFAULT 'موظف',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- Only admins (owner) can manage staff
CREATE POLICY "Admins can manage staff" ON public.staff_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Staff can view their own record
CREATE POLICY "Staff can view own record" ON public.staff_members
  FOR SELECT USING (auth.uid() = user_id);
