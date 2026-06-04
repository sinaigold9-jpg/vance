import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_API_BASE = 'https://api.telegram.org';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { purpose } = await req.json();
    const validPurposes = ['login', 'withdrawal', 'registration', 'data_change', 'telegram_link', 'password_reset'];
    if (!validPurposes.includes(purpose)) {
      return new Response(JSON.stringify({ error: 'Invalid purpose' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // For telegram_link, generate a link code (not sent via telegram)
    if (purpose === 'telegram_link') {
      const linkCode = generateCode(8);
      await adminClient.from('otp_codes').insert({
        user_id: userId,
        code: linkCode,
        purpose: 'telegram_link',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
      });

      return new Response(JSON.stringify({ success: true, link_code: linkCode }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user has telegram linked
    const { data: profile } = await adminClient
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', userId)
      .single();

    if (!profile?.telegram_chat_id) {
      return new Response(JSON.stringify({ error: 'telegram_not_linked', message: 'يرجى ربط حساب تليجرام أولاً' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: max 3 OTPs per purpose per 5 minutes
    const { count } = await adminClient
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'تم تجاوز عدد المحاولات. حاول بعد 5 دقائق.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP
    const otpCode = generateCode(6);

    // Store OTP (expires in 1 minute)
    await adminClient.from('otp_codes').insert({
      user_id: userId,
      code: otpCode,
      purpose,
      expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    });

    // Send via Telegram (direct bot token)
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'Telegram bot not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const purposeLabels: Record<string, string> = {
      login: 'تسجيل الدخول',
      withdrawal: 'سحب الأموال',
      registration: 'التسجيل',
      data_change: 'تغيير البيانات',
      password_reset: 'إعادة تعيين كلمة المرور',
    };

    const message = `🔐 رمز التحقق الخاص بك:\n\n<b>${otpCode}</b>\n\n📌 الغرض: ${purposeLabels[purpose] || purpose}\n⏱ صالح لمدة دقيقة واحدة فقط\n\n⚠️ لا تشارك هذا الرمز مع أي شخص.`;

    const tgResponse = await fetch(`${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!tgResponse.ok) {
      const tgError = await tgResponse.json();
      console.error('Telegram send failed:', tgError);
      return new Response(JSON.stringify({ error: 'Failed to send OTP via Telegram' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'تم إرسال رمز التحقق عبر تليجرام' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-otp error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateCode(length: number): string {
  const chars = '0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}
