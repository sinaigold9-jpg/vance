
-- Fix download counter update policy to only allow authenticated users
DROP POLICY "Anyone can update download counter" ON public.download_counter;
CREATE POLICY "Authenticated users can update download counter" ON public.download_counter FOR UPDATE USING (auth.uid() IS NOT NULL);
