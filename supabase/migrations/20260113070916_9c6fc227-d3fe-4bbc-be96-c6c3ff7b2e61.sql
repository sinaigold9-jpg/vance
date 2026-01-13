-- Create chat_messages table for support chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages (not admin messages)
CREATE POLICY "Users can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_from_admin = false);

-- Admins can view all messages
CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert messages for any user
CREATE POLICY "Admins can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND is_from_admin = true);

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);