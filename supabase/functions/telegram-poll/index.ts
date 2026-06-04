import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();

  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!TELEGRAM_BOT_TOKEN) return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), { status: 500 });
  const BOT_URL = `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${BOT_URL}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      // Handle callback queries (inline button presses)
      if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        const callbackQueryId = update.callback_query.id;

        if (callbackData?.startsWith('confirm_account_')) {
          const linkCode = callbackData.replace('confirm_account_', '');
          await handleAccountConfirmation(supabase, chatId, linkCode, callbackQueryId, BOT_URL);
        }

        totalProcessed++;
        continue;
      }

      if (!update.message?.text) continue;
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Handle /start with verification code
      if (text.startsWith('/start ')) {
        const linkCode = text.replace('/start ', '').trim();
        
        // Find pending OTP with this link code
        const { data: otpData } = await supabase
          .from('otp_codes')
          .select('user_id, id')
          .eq('code', linkCode)
          .eq('purpose', 'telegram_link')
          .eq('is_used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (otpData) {
          // Check if this telegram account is already linked to another user
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .neq('id', otpData.user_id)
            .maybeSingle();

          if (existingProfile) {
            await sendTelegramMessage(chatId, '❌ حساب تليجرام هذا مرتبط بحساب آخر بالفعل.\nلا يمكن استخدام نفس حساب تليجرام لأكثر من حساب واحد.', BOT_URL);
          } else {
            // Link telegram chat_id to user profile (but don't verify yet)
            await supabase
              .from('profiles')
              .update({ telegram_chat_id: chatId })
              .eq('id', otpData.user_id);

            // Mark link code as used
            await supabase
              .from('otp_codes')
              .update({ is_used: true })
              .eq('id', otpData.id);

            // Send message with inline "Confirm Account" button
            await sendTelegramMessageWithButton(
              chatId,
              '✅ تم ربط حسابك بنجاح!\n\n🔐 لتفعيل حسابك بالكامل، اضغط على الزر أدناه:',
              'تأكيد الحساب ✅',
              `confirm_account_${linkCode}`,
              BOT_URL
            );
          }
        } else {
          await sendTelegramMessage(chatId, '❌ رمز الربط غير صالح أو منتهي الصلاحية.\nيرجى إعادة المحاولة من داخل التطبيق.', BOT_URL);
        }
      }
      // Handle "بدأ" or /start without code
      else if (text === 'بدأ' || text === '/start') {
        await sendTelegramMessage(chatId, '👋 مرحباً بك في بوت Advance!\n\nلربط حسابك وتفعيله، استخدم الرابط من داخل التطبيق.\n\nبعد الربط والتفعيل، سنرسل لك رموز التحقق هنا (تسجيل الدخول، السحب، إعادة تعيين كلمة المرور).', BOT_URL);
      }

      totalProcessed++;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});

async function handleAccountConfirmation(
  supabase: any,
  chatId: number,
  linkCode: string,
  callbackQueryId: string,
  botUrl: string
) {
  await fetch(`${botUrl}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });

  // Find user by telegram_chat_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_verified')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(chatId, '❌ لم يتم العثور على حساب مرتبط.\nيرجى إعادة الربط من التطبيق.', botUrl);
    return;
  }

  if (profile.is_verified) {
    await sendTelegramMessage(chatId, '✅ حسابك مفعل بالفعل!\nيمكنك استخدام التطبيق بشكل كامل.', botUrl);
    return;
  }

  // Verify the account
  await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', profile.id);

  await sendTelegramMessage(chatId, '🎉 تم تفعيل حسابك بنجاح!\n\nيمكنك الآن استخدام جميع خدمات التطبيق.\nمرحباً بك في Advance! 🚀', botUrl);
}

async function sendTelegramMessage(chatId: number, text: string, botUrl: string) {
  await fetch(`${botUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function sendTelegramMessageWithButton(
  chatId: number,
  text: string,
  buttonText: string,
  callbackData: string,
  botUrl: string
) {
  await fetch(`${botUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: buttonText, callback_data: callbackData }]],
      }),
    }),
  });
}
