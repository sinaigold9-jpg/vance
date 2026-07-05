import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let createdBy: string | null = null;
  let payloadForLog: { title?: string; message?: string; user_id?: string } = {};

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized', message: 'يجب تسجيل الدخول قبل الإرسال' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized', message: 'جلسة الدخول غير صالحة' }, 401);
    createdBy = user.id;

    const { data: role } = await admin
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'admin_required', message: 'هذه العملية تتطلب صلاحية مدير' }, 403);

    const body = await req.json().catch(() => ({}));
    const { title, message, user_id, link } = body;
    payloadForLog = { title, message, user_id };
    if (!message || typeof message !== 'string') return json({ error: 'message_required', message: 'نص الرسالة مطلوب' }, 400);

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      const result = buildResult('failed', 0, 0, 1, [{ code: 'bot_not_configured', message: 'توكن بوت تليجرام غير مهيأ' }]);
      await logDelivery(admin, { channel: 'telegram', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'bot_not_configured', message: 'توكن بوت تليجرام غير مهيأ', ...result }, 500);
    }

    const botCheck = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const botData = await botCheck.json().catch(() => null);
    if (!botCheck.ok || !botData?.ok) {
      const result = buildResult('failed', 0, 0, 1, [{ code: 'bot_token_invalid', message: 'فشل التحقق من توكن بوت تليجرام', telegram_status: botCheck.status, telegram_response: redactTelegram(botData) }]);
      await logDelivery(admin, { channel: 'telegram', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'bot_token_invalid', message: 'توكن بوت تليجرام غير صحيح أو مرفوض', ...result }, 502);
    }

    let query = admin.from('profiles').select('id, telegram_chat_id').not('telegram_chat_id', 'is', null);
    if (user_id) query = query.eq('id', user_id);
    const { data: rows, error: rowsError } = await query;
    if (rowsError) {
      const result = buildResult('failed', 0, 0, 1, [{ code: 'telegram_users_query_failed', message: rowsError.message }]);
      await logDelivery(admin, { channel: 'telegram', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'telegram_users_query_failed', message: rowsError.message, ...result }, 500);
    }

    if (!rows?.length) {
      const result = buildResult('skipped', 0, 0, 0, [{ code: 'no_telegram_chat_ids', message: user_id ? 'هذا المستخدم غير مربوط ببوت تليجرام' : 'لا يوجد مستخدمون مربوطون ببوت تليجرام' }]);
      await logDelivery(admin, { channel: 'telegram', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });
      return json({ error: 'no_telegram_chat_ids', message: result.error_details[0].message, ...result }, 409);
    }

    const header = title ? `<b>${escapeHtml(title)}</b>\n\n` : '';
    const bodyText = escapeHtml(message);
    const footer = link ? `\n\n🔗 ${escapeHtml(link)}` : '';
    const text = `${header}${bodyText}${footer}`;

    let sent = 0, failed = 0;
    const errors: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: r.telegram_chat_id, text, parse_mode: 'HTML', disable_web_page_preview: false }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          sent++;
        } else {
          failed++;
          errors.push({ user_id: r.id, chat_id_tail: String(r.telegram_chat_id).slice(-4), code: 'telegram_send_failed', telegram_status: res.status, message: data?.description || 'رفض Telegram إرسال الرسالة', telegram_response: redactTelegram(data) });
        }
        await new Promise(resolve => setTimeout(resolve, 40));
      } catch (e: any) {
        failed++;
        errors.push({ user_id: r.id, chat_id_tail: String(r.telegram_chat_id).slice(-4), code: 'telegram_network_error', message: e?.message || 'تعذر الاتصال بتليجرام' });
      }
    }

    const status = sent > 0 && failed === 0 ? 'success' : sent > 0 ? 'partial' : 'failed';
    const result = buildResult(status, rows.length, sent, failed, errors);
    await logDelivery(admin, { channel: 'telegram', target_user_id: user_id || null, title, message, created_by: createdBy, ...result });

    return json({ ...result, success: status === 'success', bot_username: botData?.result?.username, message: summarizeTelegramResult(result) }, status === 'failed' ? 502 : 200);
  } catch (e: any) {
    console.error('broadcast-telegram', e);
    const result = buildResult('failed', 0, 0, 1, [{ code: 'internal', message: e?.message || 'خطأ داخلي' }]);
    await logDelivery(admin, { channel: 'telegram', target_user_id: payloadForLog.user_id || null, title: payloadForLog.title, message: payloadForLog.message, created_by: createdBy, ...result });
    return json({ error: 'internal', message: e?.message || 'خطأ داخلي في إرسال تليجرام', ...result }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function buildResult(status: string, target_count: number, sent_count: number, failed_count: number, error_details: Array<Record<string, unknown>>) {
  return { status, target_count, sent_count, failed_count, expired_count: 0, error_details };
}

async function logDelivery(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from('notification_delivery_logs').insert(row);
  } catch (e) {
    console.error('delivery log insert failed', e);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function redactTelegram(data: any) {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...data };
  if (copy.result?.token) copy.result.token = '[redacted]';
  return copy;
}

function summarizeTelegramResult(result: ReturnType<typeof buildResult>) {
  if (result.status === 'success') return `وصلت رسالة تليجرام إلى ${result.sent_count} مستخدم`;
  if (result.status === 'skipped') return String(result.error_details[0]?.message || 'لم يتم الإرسال');
  if (result.sent_count > 0) return `وصلت إلى ${result.sent_count} وفشل ${result.failed_count}`;
  return String(result.error_details[0]?.message || 'فشل إرسال تليجرام');
}