-- Allow users to validate codes based on manual activation only (no date restriction)
DROP POLICY IF EXISTS "Authenticated users can view today's code" ON public.daily_codes;

CREATE POLICY "Authenticated users can view active codes"
ON public.daily_codes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND COALESCE(is_active, true) = true
);
