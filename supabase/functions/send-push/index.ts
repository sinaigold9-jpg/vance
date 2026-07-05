import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@advance.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error('VAPID setup error', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let createdBy: string | null = null;
  let payloadForLog: { title?: string; message?: string; user_id?: string } = {};

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized', message: 'يجب تسجيل الدخول قبل الإرسال' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized', message: 'جلسة الدخول غير صالحة' }, 401);
    createdBy = user.id;

    const body = await req.json().catch(() => ({}));
    const { user_id, title, message, link, type } = body;
    payloadForLog = { title, message, user_id };

    if (!message || typeof message !== 'string') {
      return json({ error: 'message_required', message: 'نص الإشعار مطلوب' }, 400);
    }

    const isSelfOnly = user_id && user_id === user.id;
    if (!isSelfOnly) {
      const { data: role } = await admin
        .from('user_roles').select('role')
        .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!role) return json({ error: 'admin_required', message: 'هذه العملية تتطلب صلاحية مدير' }, 403);
    }

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      const result = buildResult('failed', 0, 0, 1, 0, [{ code: 'vapid_not_configured', message: 'مفاتيح VAPID غير مكتملة' }]);
      await logDelivery(admin, { channel: 'push', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'vapid_not_configured', message: 'يجب تكوين VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY', ...result }, 500);
    }

    const vapidFormatError = validateVapidPublicKey(VAPID_PUBLIC);
    if (vapidFormatError) {
      const result = buildResult('failed', 0, 0, 1, 0, [{ code: 'invalid_vapid_public_key', message: vapidFormatError }]);
      await logDelivery(admin, { channel: 'push', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'invalid_vapid_public_key', message: vapidFormatError, ...result }, 500);
    }

    let query = admin.from('push_subscriptions').select('id,user_id,endpoint,keys,created_at');
    if (user_id) query = query.eq('user_id', user_id);
    const { data: subscriptions, error: subError } = await query;
    if (subError) {
      const result = buildResult('failed', 0, 0, 1, 0, [{ code: 'subscription_query_failed', message: subError.message }]);
      await logDelivery(admin, { channel: 'push', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'subscription_query_failed', message: subError.message, ...result }, 500);
    }

    if (!subscriptions?.length) {
      const result = buildResult('skipped', 0, 0, 0, 0, [{ code: 'no_subscriptions', message: user_id ? 'لا يوجد جهاز مشترك لهذا المستخدم' : 'لا يوجد أي جهاز مشترك في إشعارات الهاتف' }]);
      await logDelivery(admin, { channel: 'push', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'no_subscriptions', message: result.error_details[0].message, ...result }, 409);
    }

    const payload = JSON.stringify({
      title: title || 'Advance',
      message,
      link: link || '/app',
      type: type || 'general',
      tag: `advance-${type || 'general'}-${Date.now()}`,
    });

    let sent = 0, expired = 0, failed = 0;
    const errors: Array<Record<string, unknown>> = [];
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys as any }, payload, { TTL: 86400 });
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        const body = safeParseBody(err?.body);
        const detail = {
          endpoint_tail: String(sub.endpoint).slice(-18),
          user_id: sub.user_id,
          status,
          message: body?.message || err?.message || 'فشل إرسال غير معروف',
          body,
        };
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          expired++;
          errors.push({ ...detail, code: 'expired_subscription' });
        } else {
          failed++;
          errors.push({ ...detail, code: status === 401 || status === 403 ? 'vapid_or_subscription_rejected' : 'push_send_failed' });
          console.error('push send failed', detail);
        }
      }
    }

    const status = sent > 0 && failed + expired === 0 ? 'success' : sent > 0 ? 'partial' : 'failed';
    const result = buildResult(status, subscriptions.length, sent, failed, expired, errors);
    await logDelivery(admin, { channel: 'push', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });

    const httpStatus = status === 'success' || status === 'partial' ? 200 : 502;
    return json({ ...result, success: status === 'success', message: summarizePushResult(result) }, httpStatus);
  } catch (e: any) {
    console.error('send-push error', e);
    const result = buildResult('failed', 0, 0, 1, 0, [{ code: 'internal', message: e?.message || 'خطأ داخلي' }]);
    await logDelivery(admin, { channel: 'push', target_user_id: payloadForLog.user_id || null, title: payloadForLog.title, message: payloadForLog.message, created_by: createdBy, ...result });
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي في إرسال Push', ...result }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function buildResult(status: string, target_count: number, sent_count: number, failed_count: number, expired_count: number, error_details: Array<Record<string, unknown>>) {
  return { status, target_count, sent_count, failed_count, expired_count, error_details };
}

async function logDelivery(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from('notification_delivery_logs').insert(row);
  } catch (e) {
    console.error('delivery log insert failed', e);
  }
}

function validateVapidPublicKey(key: string) {
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

function safeParseBody(body: unknown) {
  if (!body || typeof body !== 'string') return body || null;
  try { return JSON.parse(body); } catch { return body.slice(0, 500); }
}

function summarizePushResult(result: ReturnType<typeof buildResult>) {
  if (result.status === 'success') return `وصل Push إلى ${result.sent_count} جهاز`;
  if (result.status === 'skipped') return String(result.error_details[0]?.message || 'لم يتم الإرسال');
  if (result.sent_count > 0) return `وصل إلى ${result.sent_count} وفشل ${result.failed_count + result.expired_count}`;
  return String(result.error_details[0]?.message || 'فشل إرسال Push');
}