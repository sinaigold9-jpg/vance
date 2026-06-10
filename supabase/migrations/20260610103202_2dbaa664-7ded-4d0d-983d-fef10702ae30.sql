
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  applies_to_package text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active codes"
  ON public.discount_codes FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage discount codes"
  ON public.discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.package_upgrade_requests
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_discount_code(_code text, _package text, _base_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  discount numeric := 0;
  final_price numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO c FROM public.discount_codes
    WHERE upper(code) = upper(_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكود غير صحيح');
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'انتهت صلاحية الكود');
  END IF;

  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم استنفاذ الكود');
  END IF;

  IF c.applies_to_package IS NOT NULL AND c.applies_to_package <> _package THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكود لا يصلح لهذه الباقة');
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round(_base_price * c.discount_value / 100, 2);
  ELSE
    discount := c.discount_value;
  END IF;

  IF discount > _base_price THEN discount := _base_price; END IF;
  final_price := _base_price - discount;

  RETURN jsonb_build_object(
    'success', true,
    'code', c.code,
    'discount_amount', discount,
    'final_price', final_price,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_discount_code(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_codes
    SET used_count = used_count + 1
    WHERE upper(code) = upper(_code);
END;
$$;
