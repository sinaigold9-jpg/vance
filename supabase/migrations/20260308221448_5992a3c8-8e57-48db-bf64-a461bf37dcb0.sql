
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers_contests;
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.offers_contests;

CREATE POLICY "Admins can manage offers"
ON public.offers_contests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active offers"
ON public.offers_contests
FOR SELECT
TO authenticated
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));
