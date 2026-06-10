
REVOKE EXECUTE ON FUNCTION public.apply_discount_code(text, text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_discount_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apply_discount_code(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_discount_code(text) TO service_role;
