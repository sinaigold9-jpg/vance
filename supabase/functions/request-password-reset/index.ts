import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function log(admin: any, row: Record<string, unknown>) {
  try { await admin.from('notification_delivery_logs').insert(row); } catch (_e) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return json({ error: 'email_required', message: 'البريد الإلكتروني مطلوب' }, 400);
    }

    const cleanEmail = email.trim();

    const { data: profile } = await admin
      .from('profiles')
      .select('id, telegram_chat_id, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!profile?.id) {
      await log(admin, {
        channel: 'password_reset', title: 'طلب إعادة تعيين', message: cleanEmail,
        status: 'failed', target_count: 0, sent_count: 0, failed_count: 1,
        error_details: [{ code: 'email_not_found', message: 'لا يوجد حساب بهذا البريد' }],
      });
      return json({ error: 'email_not_found', message: 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني' }, 404);
    }

    if (!profile.telegram_chat_id) {
      await log(admin, {
        channel: 'password_reset', title: 'طلب إعادة تعيين', message: cleanEmail, target_user_id: profile.id,
        status: 'failed', target_count: 1, sent_count: 0, failed_count: 1,
        error_details: [{ code: 'telegram_not_linked', message: 'حساب تليجرام غير مربوط' }],
      });
      return json({ error: 'telegram_not_linked', message: 'حساب تليجرام غير مربوط بهذا البريد. اربط بوت @AdvanceAppBot أولاً.' }, 400);
    }

    // Rate limit: 3/5min
    const { count } = await admin
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('purpose', 'password_reset')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return json({ error: 'rate_limited', message: 'تم تجاوز عدد المحاولات. حاول بعد 5 دقائق.' }, 429);
    }

    // Generate 6-digit OTP valid 60s
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    const code = Array.from(arr).map(b => (b % 10).toString()).join('');

    const { error: otpErr } = await admin.from('otp_codes').insert({
      user_id: profile.id,
      code,
      purpose: 'password_reset',
      expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });
    if (otpErr) {
      await log(admin, {
        channel: 'password_reset', title: 'طلب إعادة تعيين', message: cleanEmail, target_user_id: profile.id,
        status: 'failed', target_count: 1, sent_count: 0, failed_count: 1,
        error_details: [{ code: 'otp_store_failed', message: otpErr.message }],
      });
      return json({ error: 'otp_store_failed', message: 'تعذر إنشاء رمز التحقق: ' + otpErr.message }, 500);
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      return json({ error: 'bot_not_configured', message: 'توكن بوت تليجرام غير مهيأ في الخادم' }, 500);
    }

    const message = `🔐 رمز إعادة تعيين كلمة المرور:\n\n<b>${code}</b>\n\n⏱ صالح لمدة دقيقة واحدة فقط\n⚠️ لا تشارك هذا الرمز مع أي شخص.`;
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: profile.telegram_chat_id, text: message, parse_mode: 'HTML' }),
    });
    const tgData = await tgRes.json().catch(() => null);

    if (!tgRes.ok || !tgData?.ok) {
      const desc = tgData?.description || `Telegram HTTP ${tgRes.status}`;
      await log(admin, {
        channel: 'password_reset', title: 'طلب إعادة تعيين', message: cleanEmail, target_user_id: profile.id,
        status: 'failed', target_count: 1, sent_count: 0, failed_count: 1,
        error_details: [{ code: 'telegram_send_failed', message: desc, telegram_status: tgRes.status }],
      });
      return json({ error: 'telegram_send_failed', message: 'فشل إرسال الرمز عبر تليجرام: ' + desc }, 502);
    }

    await log(admin, {
      channel: 'password_reset', title: 'طلب إعادة تعيين', message: cleanEmail, target_user_id: profile.id,
      status: 'success', target_count: 1, sent_count: 1, failed_count: 0, error_details: [],
    });
    return json({ success: true, message: 'تم إرسال رمز التحقق عبر تليجرام' });
  } catch (e: any) {
    console.error('request-password-reset error', e);
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي غير متوقع' }, 500);
  }
});