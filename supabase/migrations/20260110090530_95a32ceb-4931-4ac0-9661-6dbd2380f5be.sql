-- Drop the restrictive RLS policy that prevents users from seeing disabled settings
DROP POLICY IF EXISTS "Users can view active settings" ON public.app_settings;

-- Create new policy that allows all authenticated users to view all settings
CREATE POLICY "Users can view all settings" 
ON public.app_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);