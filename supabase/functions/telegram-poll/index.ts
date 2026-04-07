import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500 });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  // Read initial offset
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

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      if (!update.message?.text) continue;
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Handle /start with linking code
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
          // Link telegram chat_id to user profile
          await supabase
            .from('profiles')
            .update({ telegram_chat_id: chatId })
            .eq('id', otpData.user_id);

          // Mark link code as used
          await supabase
            .from('otp_codes')
            .update({ is_used: true })
            .eq('id', otpData.id);

          // Send confirmation
          await sendTelegramMessage(chatId, '✅ تم ربط حسابك بنجاح!\nسيتم إرسال رموز التحقق إليك هنا.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
        } else {
          await sendTelegramMessage(chatId, '❌ رمز الربط غير صالح أو منتهي الصلاحية.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      }
      // Handle "بدأ" or /start without code
      else if (text === 'بدأ' || text === '/start') {
        await sendTelegramMessage(chatId, '👋 مرحباً بك في بوت Advance!\n\nلربط حسابك، استخدم الرابط من داخل التطبيق.\n\nبعد الربط، سنرسل لك رموز التحقق هنا.', LOVABLE_API_KEY, TELEGRAM_API_KEY);
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

async function sendTelegramMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}
