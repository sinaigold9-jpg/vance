import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: role } = await admin
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'Admin required' }, 403);

    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || '';
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

    const [pushCount, telegramCount, latestLogs, openErrors] = await Promise.all([
      admin.from('push_subscriptions').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }).not('telegram_chat_id', 'is', null),
      admin.from('notification_delivery_logs').select('*').order('created_at', { ascending: false }).limit(12),
      admin.from('app_error_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    const { data: recentSubscriptions } = await admin
      .from('push_subscriptions')
      .select('id,user_id,endpoint,keys,created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const invalidSubscriptions = (recentSubscriptions || []).filter((s: any) => !s.endpoint || !s.keys?.p256dh || !s.keys?.auth).length;
    const vapidPublicValidation = validateVapidPublicKey(VAPID_PUBLIC);

    let telegramStatus: Record<string, unknown> = {
      configured: !!TELEGRAM_BOT_TOKEN,
      ok: false,
      bot_username: null,
      error: TELEGRAM_BOT_TOKEN ? null : 'توكن البوت غير موجود',
    };

    if (TELEGRAM_BOT_TOKEN) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await res.json().catch(() => null);
        telegramStatus = {
          configured: true,
          ok: res.ok && !!data?.ok,
          bot_username: data?.result?.username || null,
          error: res.ok && data?.ok ? null : (data?.description || `Telegram HTTP ${res.status}`),
        };
      } catch (e: any) {
        telegramStatus = { configured: true, ok: false, bot_username: null, error: e?.message || 'تعذر الاتصال بتليجرام' };
      }
    }

    const issues: Array<Record<string, string>> = [];
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) issues.push({ severity: 'error', title: 'مفاتيح VAPID غير مكتملة' });
    if (vapidPublicValidation) issues.push({ severity: 'error', title: vapidPublicValidation });
    if (!pushCount.count) issues.push({ severity: 'warning', title: 'لا يوجد أي جهاز مشترك في Push' });
    if (invalidSubscriptions > 0) issues.push({ severity: 'warning', title: 'توجد اشتراكات Push ناقصة المفاتيح' });
    if (!telegramStatus.ok) issues.push({ severity: 'error', title: String(telegramStatus.error || 'فشل اتصال تليجرام') });
    if (!telegramCount.count) issues.push({ severity: 'warning', title: 'لا يوجد مستخدمون مربوطون ببوت تليجرام' });

    return json({
      generated_at: new Date().toISOString(),
      vapid: {
        public_configured: !!VAPID_PUBLIC,
        private_configured: !!VAPID_PRIVATE,
        subject_configured: !!VAPID_SUBJECT,
        public_key_valid: !!VAPID_PUBLIC && !vapidPublicValidation,
        public_key_error: vapidPublicValidation,
        match_verified_by: 'يتم إثبات تطابق المفتاح العام والخاص عند نجاح إرسال اختبار Push فعلي',
      },
      push: {
        subscriptions_count: pushCount.count || 0,
        recent_subscriptions: (recentSubscriptions || []).map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          endpoint_tail: String(s.endpoint || '').slice(-18),
          has_keys: !!s.keys?.p256dh && !!s.keys?.auth,
          created_at: s.created_at,
        })),
        invalid_recent_subscriptions: invalidSubscriptions,
      },
      telegram: {
        ...telegramStatus,
        linked_users_count: telegramCount.count || 0,
      },
      latest_delivery_logs: latestLogs.data || [],
      open_errors_count: openErrors.count || 0,
      issues,
    });
  } catch (e: any) {
    console.error('notification-diagnostics error', e);
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي في التشخيص' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function validateVapidPublicKey(key: string) {
  if (!key) return 'المفتاح العام VAPID غير موجود';
  try {
    const padding = '='.repeat((4 - key.length % 4) % 4);
    const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    if (raw.length !== 65) return `المفتاح العام VAPID طوله غير صحيح (${raw.length} بايت بدلاً من 65)`;
    return null;
  } catch {
    return 'صيغة المفتاح العام VAPID غير صالحة';
  }
}