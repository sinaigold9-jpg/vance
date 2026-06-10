import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'weak_password', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile?.id) {
      return new Response(JSON.stringify({ error: 'invalid', message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: otpRow } = await admin
      .from('otp_codes')
      .select('id')
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')
      .eq('code', String(code))
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return new Response(JSON.stringify({ error: 'invalid', message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('otp_codes').update({ is_used: true }).eq('id', otpRow.id);

    const { error: updErr } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword });
    if (updErr) {
      return new Response(JSON.stringify({ error: 'update_failed', message: updErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث كلمة المرور بنجاح' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('reset-password error', e);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});