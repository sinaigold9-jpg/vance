import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { email, code } = await req.json();
    if (!email || !code || typeof code !== 'string' || code.length !== 6) {
      return json({ error: 'invalid_input', message: 'بيانات غير صحيحة' }, 400);
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();
    if (!profile?.id) return json({ error: 'invalid_code', message: 'رمز غير صحيح' }, 400);

    const { data: otp } = await admin
      .from('otp_codes')
      .select('id, code, expires_at, used_at')
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return json({ error: 'invalid_code', message: 'لم يتم طلب رمز' }, 400);
    if (otp.used_at) return json({ error: 'code_used', message: 'الرمز مستخدم بالفعل' }, 400);
    if (new Date(otp.expires_at).getTime() < Date.now())
      return json({ error: 'code_expired', message: 'انتهت صلاحية الرمز' }, 400);
    if (otp.code !== code) return json({ error: 'invalid_code', message: 'رمز غير صحيح' }, 400);

    return json({ success: true });
  } catch (e: any) {
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي' }, 500);
  }
});