-- Create ad categories enum
CREATE TYPE public.ad_category AS ENUM (
  'clothes', 'services', 'real_estate', 'digital_products', 'cars', 'electronics',
  'restaurants', 'travel', 'health_beauty', 'education', 'technology', 'sports',
  'hobbies', 'events', 'entertainment', 'hotels', 'music', 'design', 'games',
  'home_tools', 'decor', 'office_equipment', 'digital_apps', 'books', 'office_supplies',
  'finance', 'legal_services', 'medical_services', 'social_services', 'cafes',
  'beverages', 'fast_food', 'tourism', 'online_shopping', 'gifts', 'jewelry',
  'accessories', 'fashion', 'fitness', 'mental_health', 'workshops', 'training_courses',
  'government_services', 'festivals', 'educational_events', 'digital_services',
  'seasonal_offers', 'jobs', 'charity', 'community'
);

-- Create ad status enum
CREATE TYPE public.ad_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'archived');

-- Create ad type enum
CREATE TYPE public.ad_type AS ENUM ('free', 'paid');

-- Create advertisements table
CREATE TABLE public.advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT,
  external_link TEXT,
  category ad_category NOT NULL,
  ad_type ad_type NOT NULL DEFAULT 'free',
  status ad_status NOT NULL DEFAULT 'draft',
  images TEXT[] DEFAULT '{}',
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  max_views INTEGER DEFAULT 10,
  promotion_days INTEGER DEFAULT 0,
  promotion_amount NUMERIC DEFAULT 0,
  priority_level INTEGER DEFAULT 0,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create ad images table for multiple images
CREATE TABLE public.ad_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad interactions table (ratings, comments)
CREATE TABLE public.ad_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  points_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ad_id, user_id)
);

-- Create ad interaction replies (advertiser replies to comments)
CREATE TABLE public.ad_interaction_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_id UUID NOT NULL REFERENCES public.ad_interactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad clicks tracking
CREATE TABLE public.ad_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  points_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad views tracking
CREATE TABLE public.ad_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create advertiser profiles table
CREATE TABLE public.advertiser_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL,
  advertiser_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_interaction_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertiser_profiles ENABLE ROW LEVEL SECURITY;

-- Advertisements policies
CREATE POLICY "Users can view approved ads" ON public.advertisements
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own ads" ON public.advertisements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads" ON public.advertisements
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own ads" ON public.advertisements
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Ad images policies
CREATE POLICY "Anyone can view ad images" ON public.ad_images
  FOR SELECT USING (true);

CREATE POLICY "Ad owners can manage images" ON public.ad_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.advertisements WHERE id = ad_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Ad interactions policies
CREATE POLICY "Ad owners and admins can view interactions" ON public.ad_interactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.advertisements WHERE id = ad_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can create interactions" ON public.ad_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" ON public.ad_interactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Ad interaction replies policies
CREATE POLICY "Users can view replies on their interactions" ON public.ad_interaction_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ad_interactions WHERE id = interaction_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = user_id
  );

CREATE POLICY "Ad owners can reply" ON public.ad_interaction_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_interactions ai
      JOIN public.advertisements a ON ai.ad_id = a.id
      WHERE ai.id = interaction_id AND a.user_id = auth.uid()
    )
  );

-- Ad clicks policies
CREATE POLICY "Ad owners and admins can view clicks" ON public.ad_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.advertisements WHERE id = ad_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can track clicks" ON public.ad_clicks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ad views policies
CREATE POLICY "Ad owners and admins can view stats" ON public.ad_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.advertisements WHERE id = ad_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can track views" ON public.ad_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Advertiser profiles policies
CREATE POLICY "Anyone can view advertiser profiles" ON public.advertiser_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own advertiser profile" ON public.advertiser_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advertiser_profiles_updated_at
  BEFORE UPDATE ON public.advertiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for ad images
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true);

-- Storage policies for ad images
CREATE POLICY "Anyone can view ad images" ON storage.objects
  FOR SELECT USING (bucket_id = 'ad-images');

CREATE POLICY "Authenticated users can upload ad images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ad-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own ad images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ad-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own ad images" ON storage.objects
  FOR DELETE USING (bucket_id = 'ad-images' AND auth.uid() IS NOT NULL);