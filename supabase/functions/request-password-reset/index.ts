import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email_required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Generic response shape (don't leak existence)
    const genericOk = new Response(JSON.stringify({
      success: true,
      message: 'إذا كان البريد مسجلاً وحساب التليجرام مربوط، سيصلك رمز التحقق.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profile } = await admin
      .from('profiles')
      .select('id, telegram_chat_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile?.id) return genericOk;

    if (!profile.telegram_chat_id) {
      return new Response(JSON.stringify({
        error: 'telegram_not_linked',
        message: 'لم يتم ربط حساب تليجرام بهذا البريد. يرجى التواصل مع الدعم.',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit: 3/5min
    const { count } = await admin
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'تم تجاوز عدد المحاولات. حاول بعد 5 دقائق.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP valid 60s
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    const code = Array.from(arr).map(b => (b % 10).toString()).join('');

    await admin.from('otp_codes').insert({
      user_id: profile.id,
      code,
      purpose: 'password_reset',
      expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'config' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = `🔐 رمز إعادة تعيين كلمة المرور:\n\n<b>${code}</b>\n\n⏱ صالح لمدة دقيقة واحدة فقط\n⚠️ لا تشارك هذا الرمز مع أي شخص.`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: profile.telegram_chat_id, text: message, parse_mode: 'HTML' }),
    });

    return new Response(JSON.stringify({ success: true, message: 'تم إرسال رمز التحقق عبر تليجرام' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('request-password-reset error', e);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});